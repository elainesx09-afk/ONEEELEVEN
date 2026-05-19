// GET /api/intelligence/patterns?lead_id=...&context=...
// Retorna padrões aprendidos relevantes: "leads como este converteram com X"
// Combina:
//   - Padrões da tabela agent_memory_patterns (procedural memory)
//   - Estatísticas de conversão de leads similares
//   - Episódios chave de leads convertidos parecidos

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { voyageEmbed } from "../_lib/voyage.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const { lead_id, client_id, context, pattern_type } = req.query;
  if (!lead_id && !context) return fail(res, "MISSING_LEAD_ID_OR_CONTEXT", 400);

  try {
    const sb = await supabaseAdmin();
    const result = {};

    // 1. Padrões procedurais armazenados
    let query = sb.from("agent_memory_patterns").select("*").order("confidence", { ascending: false });
    if (client_id) query = query.eq("client_id", client_id);
    if (pattern_type) query = query.eq("pattern_type", pattern_type);

    // Se temos contexto, busca por similaridade
    if (context) {
      try {
        const [ctxVec] = await voyageEmbed(context, { inputType: "query" });
        const { data: matched } = await sb.rpc("match_memory_embeddings", {
          query_embedding: ctxVec,
          p_lead_id: null,
          p_client_id: client_id || null,
          p_source_types: ["pattern"],
          match_count: 10,
          min_similarity: 0.6,
        });
        result.context_matched_patterns = matched || [];
      } catch (e) {
        result.context_error = e.message;
      }
    }

    const { data: storedPatterns } = await query.limit(20);
    result.stored_patterns = storedPatterns || [];

    // 2. Se lead_id fornecido, calcula estatísticas de leads similares
    if (lead_id) {
      // Pega leads similares
      const { data: similar } = await sb.rpc("find_similar_leads", {
        p_lead_id: lead_id,
        p_client_id: client_id || null,
        match_count: 10,
        min_similarity: 0.65,
      });

      if (similar && similar.length > 0) {
        const ids = similar.map((s) => s.similar_lead_id);

        // Conta status dos similares (converteu? perdeu?)
        const { data: leadStats } = await sb
          .from("leads")
          .select("id,stage,status,score")
          .in("id", ids);

        const stats = (leadStats || []).reduce(
          (acc, l) => {
            const stage = l.stage || "DESCONHECIDO";
            acc[stage] = (acc[stage] || 0) + 1;
            acc.total++;
            return acc;
          },
          { total: 0 }
        );

        // Episódios chave dos leads similares CONVERTIDOS
        const convertedIds = (leadStats || [])
          .filter((l) => ["FECHADO", "POS_VENDA"].includes(l.stage))
          .map((l) => l.id);

        let winningEpisodes = [];
        if (convertedIds.length > 0) {
          const { data: episodes } = await sb
            .from("agent_memory_episodes")
            .select("event_type,title,description,importance,agent_stage")
            .in("lead_id", convertedIds)
            .gte("importance", 6)
            .order("importance", { ascending: false })
            .limit(10);
          winningEpisodes = episodes || [];
        }

        result.similar_leads_stats = stats;
        result.conversion_rate =
          stats.total > 0
            ? Math.round(
                (((stats.FECHADO || 0) + (stats.POS_VENDA || 0)) / stats.total) * 100
              )
            : 0;
        result.winning_episodes = winningEpisodes;
      }
    }

    return ok(res, result);
  } catch (e) {
    console.error("intelligence/patterns error:", e);
    return fail(res, "PATTERNS_FAILED", 500, { detail: e.message });
  }
}
