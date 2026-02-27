// GET /api/overview — KPIs para o Dashboard
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb  = await supabaseAdmin();
  const cid = auth.workspace_id;

  try {
    const { data: leads, error } = await sb.from("leads")
      .select("id,status,last_message_at,followup_sent_at").eq("client_id", cid);
    if (error) return fail(res, "OVERVIEW_LEADS_FAILED", 500, { details: error });

    const all   = leads ?? [];
    const count = (s) => all.filter(l => l.status === s).length;
    const totalLeads = all.length;
    const closed     = count("Fechado") + count("Convertido") + count("Vendido");
    const convRate   = totalLeads > 0 ? Number(((closed / totalLeads) * 100).toFixed(1)) : 0;

    const times = all.map(l => l.last_message_at).filter(Boolean).map(t => new Date(t).getTime());
    let lastActivity = times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
    if (!lastActivity) {
      const { data: lm } = await sb.from("messages").select("created_at")
        .eq("client_id", cid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (lm) lastActivity = lm.created_at;
    }

    const { count: totalMessages } = await sb.from("messages")
      .select("id", { count: "exact", head: true }).eq("client_id", cid);
    const { count: activeInstances } = await sb.from("instances")
      .select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "open");

    return ok(res, {
      total_leads:        totalLeads,
      active_instances:   Number(activeInstances || 0),
      conversion_rate:    convRate,
      last_activity:      lastActivity,
      hot_leads:          count("Qualificado") + count("Agendado"),
      total_messages:     Number(totalMessages || 0),
      total_conversions:  closed,
      followup_conversions: all.filter(l => l.followup_sent_at && ["Fechado","Convertido","Vendido"].includes(l.status)).length,
      status_breakdown: {
        novo:           count("Novo"),
        em_atendimento: count("Em atendimento"),
        qualificado:    count("Qualificado"),
        agendado:       count("Agendado"),
        fechado:        count("Fechado"),
        perdido:        count("Perdido"),
      },
    });
  } catch (e) {
    return fail(res, "OVERVIEW_UNEXPECTED_ERROR", 500, { details: e.message });
  }
}
