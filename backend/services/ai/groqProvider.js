const { getGroqTools } = require('./tools');
const { toGroqMessages } = require('./historyAdapter');

const callGroq = async ({ history, systemPrompt, includeTools = true }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not configured in backend environment.');
    err.isConfigError = true;
    throw err;
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = toGroqMessages(history, systemPrompt);

  const payload = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  };

  if (includeTools) {
    payload.tools = getGroqTools();
    payload.tool_choice = 'auto';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
      const error = new Error(`Groq API Error (${status}): ${errorMsg}`);
      error.status = status;
      throw error;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    const text = message.content || '';
    const toolCalls = [];

    if (message.tool_calls && message.tool_calls.length > 0) {
      message.tool_calls.forEach((tc) => {
        let parsedArgs = {};
        try {
          parsedArgs = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        } catch (e) {
          parsedArgs = {};
        }
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          args: parsedArgs,
        });
      });
    }

    const tokens = data.usage?.total_tokens || Math.ceil((text.length + JSON.stringify(messages).length) / 4);

    return {
      provider: 'Groq',
      model,
      text: text.trim(),
      toolCalls,
      tokens,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message.includes('aborted')) {
      const timeoutErr = new Error('Groq request timed out after 15 seconds');
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  }
};

module.exports = { callGroq };
