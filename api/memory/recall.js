// POST /api/memory/recall
// Recupera memória cognitiva de um lead: facts + episodes + summaries + semantic search opcional.
//
// Payload:
//   {
//     lead_id: UUID (required),
//     client_id: UUID (optional, restringe escopo),
//     query?: string,             // se fornecido, faz busca vetorial por similaridade
//     limit?: number,             // top-k para busca semântica (default 10)
//     min_similarity?: number,    // threshold (default 0.65)
//     include?: ["facts","episodes","summaries","semantic"]  // default: todos
//   }

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { voyageEmbed } from "../_lib/voyage.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return fail(res, "METHOD_NOT_ALLOWED", 405);

  try {
    const {
      lead_id,
      client_id,
      query,
      limit = 10,
      min_similarity = 0.65,
      include,
    } = req.body || {};

    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);

    const sb = await supabaseAdmin();
    const want = (Array.isArray(include) && include.length > 0)
      ? new Set(include)
      : new Set(["facts", "episodes", "summaries", "semantic"]);

    const result = { lead_id };

    // 1. FACTS — fatos estruturados ainda válidos
    if (want.has("facts")) {
      const { data: facts, error } = await sb
        .from("agent_memory_facts")
        .select("category,key,value,confidence,source,extracted_at")
        .eq("lead_id", lead_id)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("category", { ascending: true })
        .order("key", { ascending: true });

      if (error) console.warn("Facts query error:", error.message);
      result.facts = facts || [];

      // Agrupa por categoria para conveniência
      result.facts_by_category = (facts || []).reduce((acc, f) => {
        (acc[f.category] = acc[f.category] || []).push(f);
        return acc;
      }, {});
    }

    // 2. EPISODES — timeline (top 20 mais recentes + os 5 mais importantes)
    if (want.has("episodes")) {
      const { data: recent } = await sb
        .from("agent_memory_episodes")
        .select("event_type,title,description,importance,agent_stage,occurred_at,metadata")
        .eq("lead_id", lead_id)
        .order("occurred_at", { ascending: false })
        .limit(20);

      const { data: important } = await sb
        .from("agent_memory_episodes")
        .select("event_type,title,description,importance,occurred_at")
        .eq("lead_id", lead_id)
        .gte("importance", 7)
        .order("importance", { ascending: false })
        .limit(5);

      result.episodes_recent = recent || [];
      result.episodes_important = important || [];
    }

    // 3. SUMMARIES — resumos comprimidos
    if (want.has("summaries")) {
      const { data: sums } = await sb
        .from("agent_memory_summaries")
        .select("summary,period_start,period_end,sentiment,key_topics,message_count")
        .eq("lead_id", lead_id)
        .order("period_start", { ascending: false })
        .limit(10);
      result.summaries = sums || [];
    }

    // 4. SEMANTIC — busca vetorial se query fornecida
    if (want.has("semantic") && query && query.trim()) {
      try {
        const [queryVec] = await voyageEmbed(query, { inputType: "query" });

        const { data: matches, error } = await sb.rpc("match_memory_embeddings", {
          query_embedding: queryVec,
          p_lead_id: lead_id,
          p_client_id: client_id || null,
          p_source_types: null,
          match_count: limit,
          min_similarity,
        });

        if (error) {
          console.warn("Semantic search error:", error.message);
          result.semantic = [];
        } else {
          result.semantic = matches || [];
        }
      } catch (e) {
        console.warn("Embedding query failed:", e.message);
        result.semantic = [];
      }
    }

    return ok(res, result);
  } catch (e) {
    console.error("memory/recall error:", e);
    return fail(res, "MEMORY_RECALL_FAILED", 500, { detail: e.message });
  }
}
