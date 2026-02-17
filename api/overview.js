import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  const { data: leads, error: leadsErr } = await sb
    .from("leads")
    .select("status")
    .eq("client_id", client_id);

  if (leadsErr) return fail(res, "OVERVIEW_LEADS_FAILED", 500, { details: leadsErr });

  const statuses = (leads ?? []).map((x) => String(x.status || "Novo"));
  const totalLeads = statuses.length;
  const count = (s) => statuses.filter((v) => v === s).length;

  const closed = count("Fechado");
  const qualified = count("Qualificado");
  const scheduled = count("Agendado");

  const { count: msgCount, error: msgErr } = await sb
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client_id);

  if (msgErr) return fail(res, "OVERVIEW_MESSAGES_FAILED", 500, { details: msgErr });

  const conversionRate = totalLeads > 0 ? Number(((closed / totalLeads) * 100).toFixed(1)) : 0;
  const hotLeads = qualified + scheduled;

  return ok(res, {
    total_messages: Number(msgCount || 0),
    hot_leads: hotLeads,
    conversion_rate: conversionRate,
    followup_conversions: 0,
    roi_estimated: 0
  });
}
