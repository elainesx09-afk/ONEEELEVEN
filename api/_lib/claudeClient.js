// Claude API wrapper — Anthropic API com suporte a tool use, prompt caching e structured output.
// Modelo padrão: claude-sonnet-4-6 (mais inteligente, ótimo custo/benefício).

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * Chama Claude com mensagens, system prompt, tools opcionais.
 * @param {Object} params
 * @param {Array} params.messages - [{role: 'user'|'assistant', content: string|Array}]
 * @param {string} [params.system] - system prompt
 * @param {Array} [params.tools] - tools schemas para tool use
 * @param {string} [params.model] - default claude-sonnet-4-6
 * @param {number} [params.maxTokens] - default 2048
 * @param {number} [params.temperature] - default 0.7
 * @param {boolean} [params.cacheSystem] - se true, marca system prompt como cacheable
 * @returns {Promise<Object>} - response completa do Claude
 */
export async function claudeCall({
  messages,
  system,
  tools,
  model = DEFAULT_MODEL,
  maxTokens = 2048,
  temperature = 0.7,
  cacheSystem = false,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  };

  if (system) {
    if (cacheSystem) {
      body.system = [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ];
    } else {
      body.system = system;
    }
  }

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const res = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  return await res.json();
}

/**
 * Extrai texto puro da resposta (ignora tool_use blocks).
 */
export function claudeText(response) {
  if (!response?.content) return "";
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Extrai tool_use blocks da resposta.
 */
export function claudeToolUses(response) {
  if (!response?.content) return [];
  return response.content.filter((b) => b.type === "tool_use");
}
