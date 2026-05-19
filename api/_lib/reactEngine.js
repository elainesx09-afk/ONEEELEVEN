// Motor cognitivo ReAct (Reason + Act) — implementa o loop de raciocínio multi-passo.
//
// Padrão:
//   1. PERCEIVE — recebe input (mensagem nova + contexto inicial)
//   2. THINK    — Claude analisa e decide se precisa de ferramenta
//   3. ACT      — executa tool (recall_memory, search_kb, etc)
//   4. OBSERVE  — incorpora resultado na conversation history
//   5. REPEAT   — volta para THINK até decidir send_message ou escalate
//
// Máximo de loops: 5 (configurável). Cada loop tem timeout de 30s.

import { claudeCall, claudeText, claudeToolUses } from "./claudeClient.js";
import { COGNITIVE_TOOLS, executeTool } from "./cognitiveTools.js";

const MAX_LOOPS = 5;
const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * Roda o loop ReAct até decisão final.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt - persona/role do agente
 * @param {Array} params.initialMessages - histórico relevante já carregado
 * @param {string} params.userMessage - mensagem nova do lead (input atual)
 * @param {Object} params.ctx - { lead_id, client_id, agent_stage }
 * @param {Function} [params.onStep] - callback opcional para logging de cada passo
 * @returns {Promise<{messages, toolCalls, finalAction, loops}>}
 */
export async function runReactLoop({
  systemPrompt,
  initialMessages = [],
  userMessage,
  ctx,
  onStep,
  maxLoops = MAX_LOOPS,
  model = DEFAULT_MODEL,
}) {
  const messages = [
    ...initialMessages,
    { role: "user", content: userMessage },
  ];

  const toolCalls = [];
  let finalAction = null;
  let loop = 0;

  while (loop < maxLoops && !finalAction) {
    loop++;

    if (onStep) onStep({ phase: "think", loop, ctx });

    // THINK — chama Claude com tools disponíveis
    let response;
    try {
      response = await claudeCall({
        system: systemPrompt,
        messages,
        tools: COGNITIVE_TOOLS,
        model,
        maxTokens: 2048,
        temperature: 0.7,
        cacheSystem: true,
      });
    } catch (e) {
      return {
        messages,
        toolCalls,
        finalAction: { type: "error", error: e.message },
        loops: loop,
      };
    }

    const tools = claudeToolUses(response);
    const text = claudeText(response);

    // Se Claude não pediu ferramenta nenhuma, é resposta final (sem send_message)
    if (tools.length === 0) {
      // Fallback: se não chamou send_message mas gerou texto, considera como resposta
      finalAction = text
        ? { type: "direct_response", text, stop_reason: response.stop_reason }
        : { type: "no_action", stop_reason: response.stop_reason };
      messages.push({ role: "assistant", content: text || "(sem resposta)" });
      break;
    }

    // Adiciona resposta do assistant com tool_use blocks
    messages.push({ role: "assistant", content: response.content });

    // Executa cada tool e adiciona tool_result
    const toolResults = [];
    for (const tool of tools) {
      if (onStep) onStep({ phase: "act", loop, tool: tool.name, input: tool.input });

      let result;
      try {
        result = await executeTool(tool.name, tool.input, ctx);
      } catch (e) {
        result = { error: e.message };
      }

      toolCalls.push({ name: tool.name, input: tool.input, output: result, loop });

      toolResults.push({
        type: "tool_result",
        tool_use_id: tool.id,
        content: JSON.stringify(result),
      });

      // Tools terminais — interrompem o loop
      if (tool.name === "send_message" && result.ok) {
        finalAction = { type: "message_sent", message_id: result.message_id, text: tool.input.text };
      }
      if (tool.name === "escalate_to_human" && result.ok) {
        finalAction = { type: "escalated", reason: tool.input.reason };
      }
    }

    // Adiciona resultados como user message para o próximo loop
    messages.push({ role: "user", content: toolResults });

    if (finalAction) break;
  }

  // Se saiu por max loops sem decisão
  if (!finalAction) {
    finalAction = { type: "max_loops_exceeded", loops: maxLoops };
  }

  return { messages, toolCalls, finalAction, loops: loop };
}
