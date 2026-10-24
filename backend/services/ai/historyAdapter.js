/**
 * History Adapter for Neutral Conversation Format
 * Neutral Format:
 * {
 *   role: 'user' | 'assistant' | 'system' | 'tool',
 *   content: string,
 *   tool_calls?: [{ id, name, args }],
 *   tool_results?: [{ id, name, result }]
 * }
 */

// Adapter to Gemini API format
const toGeminiContents = (neutralHistory, systemPrompt) => {
  const contents = [];

  // Gemini uses 'user' and 'model'
  for (const item of neutralHistory) {
    if (item.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: item.content || '' }],
      });
    } else if (item.role === 'assistant') {
      const parts = [];
      if (item.content) {
        parts.push({ text: item.content });
      }
      if (item.tool_calls && item.tool_calls.length > 0) {
        item.tool_calls.forEach((tc) => {
          parts.push({
            functionCall: {
              name: tc.name,
              args: typeof tc.args === 'string' ? JSON.parse(tc.args) : (tc.args || {}),
            },
          });
        });
      }
      if (parts.length > 0) {
        contents.push({ role: 'model', parts });
      }
    } else if (item.role === 'tool') {
      // In Gemini, function responses are sent under role 'user' (or 'function' in older API) as functionResponse
      const parts = [];
      if (item.tool_results && item.tool_results.length > 0) {
        item.tool_results.forEach((tr) => {
          parts.push({
            functionResponse: {
              name: tr.name,
              response: { result: tr.result },
            },
          });
        });
      } else if (item.name) {
        let parsedResult = item.content;
        try {
          parsedResult = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
        } catch (e) {}
        parts.push({
          functionResponse: {
            name: item.name,
            response: { result: parsedResult },
          },
        });
      }
      if (parts.length > 0) {
        contents.push({ role: 'user', parts });
      }
    }
  }

  // Ensure alternating user/model if consecutive or empty
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return contents;
};

// Adapter to Groq (OpenAI-compatible) API format
const toGroqMessages = (neutralHistory, systemPrompt) => {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  for (const item of neutralHistory) {
    if (item.role === 'user') {
      messages.push({
        role: 'user',
        content: item.content || '',
      });
    } else if (item.role === 'assistant') {
      const msg = {
        role: 'assistant',
        content: item.content || null,
      };
      if (item.tool_calls && item.tool_calls.length > 0) {
        msg.tool_calls = item.tool_calls.map((tc) => ({
          id: tc.id || `call_${Math.random().toString(36).substring(2, 9)}`,
          type: 'function',
          function: {
            name: tc.name,
            arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args || {}),
          },
        }));
      }
      messages.push(msg);
    } else if (item.role === 'tool') {
      if (item.tool_results && item.tool_results.length > 0) {
        item.tool_results.forEach((tr) => {
          messages.push({
            role: 'tool',
            tool_call_id: tr.id,
            content: typeof tr.result === 'object' ? JSON.stringify(tr.result) : String(tr.result),
          });
        });
      } else {
        messages.push({
          role: 'tool',
          tool_call_id: item.tool_call_id || item.id || 'call_0',
          content: typeof item.content === 'object' ? JSON.stringify(item.content) : String(item.content || ''),
        });
      }
    }
  }

  return messages;
};

module.exports = {
  toGeminiContents,
  toGroqMessages,
};
