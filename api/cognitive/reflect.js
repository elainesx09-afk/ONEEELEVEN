// POST /api/cognitive/reflect
// Reflexão pós-ação: o agente avalia se sua última resposta foi efetiva
// e converte aprendizados em padrões procedurais persistidos.
//
// Quando chamar:
//   - Após o lead responder (incorpora reação do lead)
//   - Após N horas sem resposta (marca silêncio como sinal)
//   - Após conversão/perda (revisão final)
//
// Payload:
//   {
//     lead_id: UUID,
//     client_id?: UUID,
//     agent_message_id: UUID,        // mensagem do agente que estamos avaliando
//     reaction?: {                   // o que aconteceu depois
//        type: "lead_replied" | "lead_silent" | "lead_converted" | "lead_lost",
//        lead_message?: string,      // se respondeu, o que disse
//        time_to_reply_minutes?: number
//     },
//     auto_extract_pattern?: boolean // default true — extrai pattern e salva
//   }

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { claudeCall, claudeText } from "../_lib/claudeClient.js";
import { voyageEmbed } from "../_lib/voyage.js";

const REFLECTION_PROMPT = `Você é um analista de performance de vendas IA.

Avalie a resposta dada pelo agente IA ao lead, considerando:
1. A reação subsequente do lead
2. O contexto da conversa
3. O estágio do funil

Retorne JSON puro:
{
  "effectiveness": 0.0 a 1.0,        // 0 = falha total, 1 = ótimo
  "outcome": "success" | "failure" | "neutral",
  "what_worked": "..."  ou null,     // se positivo
  "what_failed": "..."  ou null,     // se negativo
  "pattern": {                       // padrão extraído (se relevante)
    "type": "closing_script" | "objection_handling" | "qualification" | "followup_timing" | "rapport_building",
    "context": "descrição curta do contexto onde isso se aplica",
    "action": "o que foi feito (parafraseado)",
    "lesson": "aprendizado generalizável para o futuro"
  } ou null,
  "should_save_pattern": true | false
}

Critérios:
- effectiveness alto: lead respondeu rápido, positivo, avançou no funil
- effectiveness baixo: lead sumiu, objetou, recusou
- Só sugira save_pattern=true se for um aprendizado generalizável (não anedótico)`;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return fail(res, "METHOD_NOT_ALLOWED", 405);

  try {
    const { lead_id, client_id, agent_message_id, reaction, auto_extract_pattern = true } =
      req.body || {};

    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);
    if (!agent_message_id) return fail(res, "MISSING_AGENT_MESSAGE_ID", 400);
    if (!reaction || !reaction.type) return fail(res, "MISSING_REACTION", 400);

    const sb = await supabaseAdmin();

    // 1. Carrega a mensagem do agente + contexto (mensagens anteriores)
    const { data: agentMsg, error: e1 } = await sb
      .from("messages")
      .select("id,content,role,created_at")
      .eq("id", agent_message_id)
      .single();

    if (e1 || !agentMsg) return fail(res, "AGENT_MESSAGE_NOT_FOUND", 404);

    const { data: prevMsgs } = await sb
      .from("messages")
      .select("role,content,created_at")
      .eq("lead_id", lead_id)
      .lt("created_at", agentMsg.created_at)
      .order("created_at", { ascending: false })
      .limit(6);

    const context = (prevMsgs || [])
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    // 2. Chama Claude para refletir
    const userPrompt = `CONTEXTO ANTERIOR:
${context}

RESPOSTA DO AGENTE:
${agentMsg.content}

REAÇÃO DO LEAD:
- Tipo: ${reaction.type}
${reaction.lead_message ? `- Mensagem do lead: "${reaction.lead_message}"` : ""}
${reaction.time_to_reply_minutes != null ? `- Tempo até responder: ${reaction.time_to_reply_minutes} min` : ""}`;

    let reflection;
    try {
      const claudeResp = await claudeCall({
        system: REFLECTION_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 1024,
        temperature: 0.4,
        cacheSystem: true,
      });

      const rawText = claudeText(claudeResp);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in reflection response");
      reflection = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn("Reflection generation failed:", e.message);
      // Fallback: classificação heurística simples
      reflection = {
        effectiveness:
          reaction.type === "lead_converted"
            ? 1.0
            : reaction.type === "lead_replied"
            ? 0.7
            : reaction.type === "lead_silent"
            ? 0.3
            : 0.1,
        outcome:
          reaction.type === "lead_converted" || reaction.type === "lead_replied"
            ? "success"
            : "failure",
        what_worked: null,
        what_failed: null,
        pattern: null,
        should_save_pattern: false,
      };
    }

    // 3. Registra episódio de reflexão
    await sb.from("agent_memory_episodes").insert({
      lead_id,
      client_id: client_id || null,
      event_type: "reflection",
      title: `Reflexão: ${reflection.outcome} (eff ${reflection.effectiveness?.toFixed(2)})`,
      description: reflection.what_worked || reflection.what_failed || "Reflexão sem detalhes",
      importance: reflection.outcome === "success" ? 6 : 4,
      metadata: {
        agent_message_id,
        reaction,
        effectiveness: reflection.effectiveness,
        outcome: reflection.outcome,
      },
    });

    // 4. Se reflection sugere salvar padrão, gera embedding do contexto e persiste
    let pattern_saved = false;
    if (
      auto_extract_pattern &&
      reflection.should_save_pattern &&
      reflection.pattern &&
      reflection.pattern.context &&
      reflection.pattern.action
    ) {
      try {
        const [ctxVec] = await voyageEmbed(reflection.pattern.context, {
          inputType: "document",
        });

        const { error: pErr } = await sb.from("agent_memory_patterns").insert({
          client_id: client_id || null,
          pattern_type: reflection.pattern.type || "general",
          context: reflection.pattern.context,
          action: reflection.pattern.action,
          outcome: reflection.outcome,
          confidence: 0.6, // pattern novo começa com confiança média
          sample_size: 1,
          context_embedding: ctxVec,
          metadata: { lesson: reflection.pattern.lesson, agent_message_id },
        });

        if (!pErr) pattern_saved = true;
      } catch (e) {
        console.warn("Pattern persist failed:", e.message);
      }
    }

    return ok(res, {
      reflection,
      pattern_saved,
      lead_id,
    });
  } catch (e) {
    console.error("cognitive/reflect error:", e);
    return fail(res, "REFLECT_FAILED", 500, { detail: e.message });
  }
}
