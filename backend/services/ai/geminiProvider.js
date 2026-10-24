const { getGeminiFunctionDeclarations } = require('./tools');
const { toGeminiContents } = require('./historyAdapter');

const callGemini = async ({ history, systemPrompt, includeTools = true }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured in backend environment.');
    err.isConfigError = true;
    throw err;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = toGeminiContents(history, systemPrompt);

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  };

  if (includeTools) {
    payload.tools = [
      {
        functionDeclarations: getGeminiFunctionDeclarations(),
      },
    ];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let parsed = {};
      try {
        parsed = JSON.parse(errText);
      } catch (e) {}

      const errorMsg = parsed.error?.message || errText;
      const status = res.status;

      const error = new Error(`Gemini API Error (${status}): ${errorMsg}`);
      error.status = status;
      error.isQuotaExhausted =
        status === 429 ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('rate limit');
      error.isServerError = status >= 500 && status < 600;
      throw error;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let text = '';
    const toolCalls = [];

    parts.forEach((p) => {
      if (p.text) {
        text += p.text;
      }
      if (p.functionCall) {
        toolCalls.push({
          id: `gemini_call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: p.functionCall.name,
          args: p.functionCall.args || {},
        });
      }
    });

    const tokens = (data.usageMetadata?.totalTokenCount) || Math.ceil((text.length + JSON.stringify(contents).length) / 4);

    return {
      provider: 'Gemini',
      model,
      text: text.trim(),
      toolCalls,
      tokens,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message.includes('aborted')) {
      const timeoutErr = new Error('Gemini request timed out after 15 seconds');
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  }
};

module.exports = { callGemini };
