// POST /api/intelligence/best-response
// Retorna a melhor resposta para um contexto baseado em padrões de sucesso histórico.
// Útil para o agente decidir o que falar quando enfrenta uma objeção/situação que outros leads já passaram.
//
// Payload:
//   {
//     context: string,         // descrição do momento atual (ex: "lead falou que está caro")
//     client_id?: UUID,
//     stage?: string,          // estágio do funil (filtra padrões relevantes)
//     limit?: number
//   }

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { voyageEmbed } from "../_lib/voyage.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const { context, client_id, stage, limit = 5 } = req.body || {};
  if (!context) return fail(res, "MISSING_CONTEXT", 400);

  try {
    const sb = await supabaseAdmin();
    const [ctxVec] = await voyageEmbed(context, { inputType: "query" });

    // 1. Busca padrões com outcome=success que combinam com o contexto
    const { data: successPatterns } = await sb
      .from("agent_memory_patterns")
      .select("pattern_type,context,action,outcome,confidence,sample_size,metadata")
      .eq("outcome", "success")
      .order("confidence", { ascending: false })
      .limit(50); // pega muitos pra filtrar por similaridade depois

    // Filtra manualmente por similaridade se tiver embedding stored (futuro)
    // Por ora retorna os top N por confidence

    // 2. Busca também histórico de respostas que funcionaram em conversas similares
    // — encontra mensagens (role=assistant) cujos contexts (mensagens anteriores) parecem com o contexto atual
    const { data: similarMessages } = await sb.rpc("match_memory_embeddings", {
      query_embedding: ctxVec,
      p_lead_id: null,
      p_client_id: client_id || null,
      p_source_types: ["message"],
      match_count: 20,
      min_similarity: 0.65,
    });

    // Para cada match, busca a próxima mensagem do assistant e verifica se levou a conversão
    const winning = [];
    if (similarMessages && similarMessages.length > 0) {
      for (const match of similarMessages.slice(0, 10)) {
        // Pega a próxima mensagem do assistant após esse match no mesmo lead
        const { data: nextMsgs } = await sb
          .from("messages")
          .select("id,content,created_at,role")
          .eq("lead_id", match.lead_id)
          .eq("role", "assistant")
          .gt("created_at", match.metadata?.created_at || "1970-01-01")
          .order("created_at", { ascending: true })
          .limit(1);

        if (nextMsgs && nextMsgs.length > 0) {
          // Verifica se o lead acabou convertendo
          const { data: leadInfo } = await sb
            .from("leads")
            .select("id,stage,status")
            .eq("id", match.lead_id)
            .single();

          const converted = leadInfo && ["FECHADO", "POS_VENDA"].includes(leadInfo.stage);

          if (converted) {
            winning.push({
              context_matched: match.content,
              similarity: match.similarity,
              winning_response: nextMsgs[0].content,
              lead_outcome: leadInfo.stage,
            });
          }
        }
      }
    }

    return ok(res, {
      success_patterns: (successPatterns || []).slice(0, limit),
      winning_responses: winning.slice(0, limit),
      count: winning.length,
    });
  } catch (e) {
    console.error("intelligence/best-response error:", e);
    return fail(res, "BEST_RESPONSE_FAILED", 500, { detail: e.message });
  }
}
