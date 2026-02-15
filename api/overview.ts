// api/overview.ts
import { setCors, ok, fail } from "./_lib/response.ts";
import { requireAuth } from "./_lib/auth.ts";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

const ALLOWED = new Set([
  "Novo",
  "Em atendimento",
  "Qualificado",
  "Agendado",
  "Fechado",
  "Perdido",
]);

const norm = (s: any) => {
  const v = String(s || "Novo").trim();
  return ALLOWED.has(v) ? v : "Novo";
};

async function countLeadsByStatus(sb: any, client_id: string, status: string) {
  // count exato sem trazer linhas
  const { count, error } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client_id)
    .eq("status", status);

  if (error) throw error;
  return Number(count || 0);
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  try {
    // total leads
    const { count: totalCount, error: totalErr } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client_id);

    if (totalErr) return fail(res, "OVERVIEW_TOTAL_LEADS_FAILED", 500, { details: totalErr });

    const totalLeads = Number(totalCount || 0);

    // contagens por status (escala melhor)
    const closed = await countLeadsByStatus(sb, client_id, norm("Fechado"));
    const qualified = await countLeadsByStatus(sb, client_id, norm("Qualificado"));
    const scheduled = await countLeadsByStatus(sb, client_id, norm("Agendado"));

    // total messages
    const { count: msgCount, error: msgErr } = await sb
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client_id);

    if (msgErr) return fail(res, "OVERVIEW_MESSAGES_FAILED", 500, { details: msgErr });

    const conversionRate =
      totalLeads > 0 ? Number(((closed / totalLeads) * 100).toFixed(1)) : 0;

    const hotLeads = qualified + scheduled;

    return ok(res, {
      total_messages: Number(msgCount || 0),
      hot_leads: hotLeads,
      conversion_rate: conversionRate,
      followup_conversions: 0,
      roi_estimated: 0,
    });
  } catch (e: any) {
    return fail(res, "OVERVIEW_FAILED", 500, { details: e });
  }
}
