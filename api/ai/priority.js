import { setCors, ok, fail } from "../_lib/response.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return ok(res, { route: "/api/ai/priority" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  try {
    const { lead_id } = req.body || {};
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);

    // LEAD
    const { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .maybeSingle();

    if (!lead) return fail(res, "LEAD_NOT_FOUND", 404);

    // MEMORY
    const { data: memory } = await sb
      .from("lead_memory")
      .select("*")
      .eq("lead_id", lead_id)
      .maybeSingle();

    const m = memory?.memory || {};

    // =========================
    // SCORE ENGINE
    // =========================

    let score = 0;

    if (lead.stage === "QUALIFICADO") score += 30;
    if (lead.stage === "AGENDADO") score += 50;
    if (m.engagement_score > 70) score += 20;
    if (m.trust_score > 60) score += 15;
    if (m.urgency === "high") score += 20;
    if (lead.last_message_at) {
      const diff =
        (Date.now() - new Date(lead.last_message_at).getTime()) /
        1000 /
        60;
      if (diff < 10) score += 15;
    }

    const chance_de_venda = Math.min(95, score);
    const priority =
      score > 70 ? "HOT" :
      score > 40 ? "WARM" :
      "COLD";

    // UPDATE
    await sb
      .from("leads")
      .update({
        priority,
        chance_de_venda
      })
      .eq("id", lead_id);

    return ok(res, {
      priority,
      chance_de_venda
    });

  } catch (e) {
    console.error(e);
    return fail(res, "INTERNAL_ERROR", 500);
  }
}
