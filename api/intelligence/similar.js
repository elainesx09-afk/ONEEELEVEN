// GET /api/intelligence/similar?lead_id=...&limit=5
// Encontra leads semanticamente parecidos com o lead alvo.
// Usa busca vetorial nos embeddings (agent_memory_embeddings) via RPC find_similar_leads.

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const { lead_id, client_id, limit = 5, min_similarity = 0.70 } = req.query;
  if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);

  try {
    const sb = await supabaseAdmin();
    const { data, error } = await sb.rpc("find_similar_leads", {
      p_lead_id: lead_id,
      p_client_id: client_id || null,
      match_count: parseInt(limit, 10) || 5,
      min_similarity: parseFloat(min_similarity) || 0.70,
    });

    if (error) return fail(res, "RPC_ERROR", 500, { detail: error.message });

    // Enriquece com dados do lead (nome, stage, status) para o frontend
    const ids = (data || []).map((s) => s.similar_lead_id);
    let leadDetails = {};
    if (ids.length > 0) {
      const { data: leads } = await sb
        .from("leads")
        .select("id,name,phone,stage,status,score,last_message_at")
        .in("id", ids);
      leadDetails = (leads || []).reduce((acc, l) => {
        acc[l.id] = l;
        return acc;
      }, {});
    }

    const enriched = (data || []).map((s) => ({
      ...s,
      lead: leadDetails[s.similar_lead_id] || null,
    }));

    return ok(res, { similar: enriched, count: enriched.length });
  } catch (e) {
    console.error("intelligence/similar error:", e);
    return fail(res, "INTELLIGENCE_FAILED", 500, { detail: e.message });
  }
}
