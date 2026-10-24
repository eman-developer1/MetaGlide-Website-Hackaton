const { callGemini } = require('./geminiProvider');
const { callGroq } = require('./groqProvider');
const { isGeminiOnCooldown, triggerGeminiCooldown, getCooldownStatus } = require('./cooldownManager');
const { executeTool } = require('./tools');
const { getSystemPrompt } = require('./systemPrompt');
const dataStore = require('../dataStore');

// In-memory hourly rate limiter: ~20 requests per user per hour
const userRateLimits = new Map();

const checkRateLimit = (userId) => {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 20;

  const timestamps = userRateLimits.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false;
  }

  validTimestamps.push(now);
  userRateLimits.set(userId, validTimestamps);
  return true;
};

// Dispatch a single prompt or turn with Gemini first, fallback to Groq
const dispatchAIRequest = async ({ history, systemPrompt, caller, includeTools = true, forceProvider = null }) => {
  const startTime = Date.now();
  let providerUsed = '';
  let primaryFailed = false;
  let fallbackReason = '';
  let result = null;

  const onCooldown = isGeminiOnCooldown();
  const geminiAvailable = !!process.env.GEMINI_API_KEY && !onCooldown && forceProvider !== 'groq';

  // 1. Try Gemini if available and not on cooldown
  if (geminiAvailable) {
    try {
      result = await callGemini({ history, systemPrompt, includeTools });
      providerUsed = 'Gemini';
    } catch (err) {
      primaryFailed = true;
      fallbackReason = err.message || 'Gemini error';
      console.warn(`[AI Orchestrator] Gemini failed (${fallbackReason}). Switching immediately to Groq fallback.`);

      // If quota exhausted or rate limited or 5xx, trigger cooldown
      if (err.isQuotaExhausted || err.isServerError || err.isTimeout) {
        triggerGeminiCooldown(err.isQuotaExhausted ? 'Quota/Rate Limit Exhausted' : err.message);
      }
    }
  } else {
    primaryFailed = true;
    fallbackReason = onCooldown
      ? `Gemini cooldown active (${getCooldownStatus().reason})`
      : 'Gemini not configured or Groq explicitly requested';
  }

  // 2. Fallback to Groq if Gemini was not used or failed
  if (!result) {
    try {
      result = await callGroq({ history, systemPrompt, includeTools });
      providerUsed = 'Groq';
    } catch (groqErr) {
      console.error('[AI Orchestrator] Both Gemini and Groq failed:', groqErr.message);
      const totalLatency = Date.now() - startTime;
      await dataStore.logAI({
        userId: caller?.id || caller?._id || 'system',
        userName: caller?.name || 'System',
        userRole: caller?.role || 'System',
        endpoint: '/ai/chat',
        providerUsed: 'fallback_error',
        primaryFailed: true,
        fallbackReason: `Gemini: ${fallbackReason} | Groq: ${groqErr.message}`,
        tokensUsed: 0,
        latencyMs: totalLatency,
        toolCalls: [],
      });

      return {
        success: false,
        bothFailed: true,
        message: 'The AI service is temporarily unavailable right now. Please use the standard web forms or try again shortly.',
        providerUsed: 'None',
      };
    }
  }

  const latencyMs = Date.now() - startTime;

  return {
    success: true,
    result,
    providerUsed,
    primaryFailed,
    fallbackReason,
    latencyMs,
  };
};

/**
 * Full Chat Orchestration Loop with Tool Calling
 * Loops up to 4 times if the model invokes tool calls
 */
const runChatConversation = async ({ history, caller, forceProvider = null }) => {
  const systemPrompt = getSystemPrompt(caller);
  const runningHistory = [...history];
  const allExecutedTools = [];
  let finalProvider = '';
  let fallbackReason = '';
  let primaryFailed = false;
  let totalTokens = 0;
  let totalLatency = 0;

  let currentLoop = 0;
  const maxLoops = 4;

  while (currentLoop < maxLoops) {
    currentLoop++;
    const dispatch = await dispatchAIRequest({
      history: runningHistory,
      systemPrompt,
      caller,
      includeTools: true,
      forceProvider,
    });

    if (!dispatch.success) {
      return dispatch;
    }

    const { result, providerUsed, primaryFailed: pFailed, fallbackReason: fbReason, latencyMs } = dispatch;
    finalProvider = providerUsed;
    if (pFailed) {
      primaryFailed = true;
      fallbackReason = fbReason;
    }
    totalTokens += result.tokens || 0;
    totalLatency += latencyMs;

    // If no tool calls, model returned final text
    if (!result.toolCalls || result.toolCalls.length === 0) {
      // Append assistant response to running history
      runningHistory.push({
        role: 'assistant',
        content: result.text,
      });

      // Log AI invocation
      await dataStore.logAI({
        userId: caller?.id || caller?._id || 'system',
        userName: caller?.name || 'System',
        userRole: caller?.role || 'System',
        endpoint: '/ai/chat',
        providerUsed: finalProvider,
        primaryFailed,
        fallbackReason,
        tokensUsed: totalTokens,
        latencyMs: totalLatency,
        toolCalls: allExecutedTools,
      });

      return {
        success: true,
        content: result.text,
        providerUsed: finalProvider,
        primaryFailed,
        fallbackReason,
        history: runningHistory,
        executedTools: allExecutedTools,
        latencyMs: totalLatency,
      };
    }

    // Model requested tool calls
    runningHistory.push({
      role: 'assistant',
      content: result.text || null,
      tool_calls: result.toolCalls,
    });

    // Execute each requested tool in parallel
    const toolResults = [];
    for (const tc of result.toolCalls) {
      allExecutedTools.push({ name: tc.name, args: tc.args });
      const output = await executeTool(tc.name, tc.args, caller);
      toolResults.push({
        id: tc.id,
        name: tc.name,
        result: output,
      });
    }

    // Append tool results to running history
    runningHistory.push({
      role: 'tool',
      tool_results: toolResults,
    });
  }

  return {
    success: true,
    content: 'Conversation completed successfully.',
    providerUsed: finalProvider,
    primaryFailed,
    fallbackReason,
    history: runningHistory,
    executedTools: allExecutedTools,
  };
};

/**
 * Generate 3-5 KPI insight bullets for the dashboard
 */
const generateDashboardSummary = async ({ kpiData, caller }) => {
  const prompt = `Here are the current real-time organization KPI numbers for ${caller.role} view:
${JSON.stringify(kpiData, null, 2)}

Provide exactly 3 to 5 high-impact, professional executive bullet points summarizing these specific metrics. Focus strictly on the numbers provided, highlight positive trends, and note any attention points (like late comers or pending leaves). Keep it concise and actionable.`;

  const history = [{ role: 'user', content: prompt }];
  const systemPrompt = `You are an executive HR intelligence analyst for MetaGlide Marketing. Produce 3-5 clean bullet points summarizing only the supplied metrics. Do not invent numbers.`;

  const dispatch = await dispatchAIRequest({
    history,
    systemPrompt,
    caller,
    includeTools: false,
  });

  if (!dispatch.success) {
    return {
      success: false,
      summary: [
        'Dashboard metrics active and synchronized with current database records.',
        'Employee attendance and work hours are being tracked in real time.',
        'Review pending approvals and team distribution across active departments.',
      ],
      providerUsed: 'Fallback Engine',
    };
  }

  const bullets = dispatch.result.text
    .split(/\n/)
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 5)
    .slice(0, 5);

  return {
    success: true,
    bullets,
    rawText: dispatch.result.text,
    providerUsed: dispatch.providerUsed,
  };
};

/**
 * Parse natural language leave request into validated JSON {type, start, end, reason}
 * Retries once on invalid JSON. Never saves on its own.
 */
const parseSmartLeave = async ({ promptText, caller }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const systemPrompt = `You are a structured parser for leave applications. Given an employee's free-text request, extract the leave details and respond with ONLY a raw JSON object conforming strictly to this format:
{
  "type": "Casual" | "Sick" | "Annual",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "reason": "Clear concise reason"
}
Reference date today is ${todayStr}.
Do NOT enclose in markdown code fences. Respond with raw JSON ONLY.`;

  let history = [{ role: 'user', content: promptText }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const dispatch = await dispatchAIRequest({
      history,
      systemPrompt,
      caller,
      includeTools: false,
    });

    if (!dispatch.success) {
      break;
    }

    let text = dispatch.result.text.trim();
    // Strip markdown code fences if model accidentally wrapped it
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    try {
      const parsed = JSON.parse(text);
      if (parsed.type && parsed.start && parsed.end && parsed.reason) {
        return {
          success: true,
          leaveData: {
            type: ['Casual', 'Sick', 'Annual'].includes(parsed.type) ? parsed.type : 'Casual',
            start: parsed.start,
            end: parsed.end,
            reason: parsed.reason,
          },
          providerUsed: dispatch.providerUsed,
        };
      }
    } catch (e) {
      console.warn(`[Smart Leave Parser] JSON parse attempt ${attempt} failed. Retrying...`);
      history.push({ role: 'assistant', content: text });
      history.push({
        role: 'user',
        content: 'Your previous response was not valid JSON. Please reply with ONLY valid JSON { "type": "Casual"|"Sick"|"Annual", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "reason": "..." }',
      });
    }
  }

  // Graceful rule-based extraction fallback if LLM returned malformed JSON
  return {
    success: true,
    leaveData: {
      type: promptText.toLowerCase().includes('sick') ? 'Sick' : promptText.toLowerCase().includes('annual') ? 'Annual' : 'Casual',
      start: todayStr,
      end: todayStr,
      reason: promptText.slice(0, 100),
    },
    providerUsed: 'Rule-based parser',
  };
};

module.exports = {
  checkRateLimit,
  runChatConversation,
  generateDashboardSummary,
  parseSmartLeave,
};
