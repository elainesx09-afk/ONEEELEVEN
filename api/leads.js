// GET    /api/leads           → lista leads
// POST   /api/leads           → cria lead
// PATCH  /api/leads?id=:id    → atualiza status
// GET    /api/leads?route=stale            (via rewrite de /api/leads/stale)
// PATCH  /api/leads?route=followup&id=:id  (via rewrite de /api/leads/:id/followup)
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

const STAGES = new Set(["Novo","Em atendimento","Qualificado","Agendado","Fechado","Perdido"]);
const safeStage = (v) => { const s = String(v || "Novo").trim(); return STAGES.has(s) ? s : "Novo"; };
const mapLead   = (l) => ({ ...l, workspace_id: l.client_id, stage: safeStage(l.status || l.stage) });

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb  = await supabaseAdmin();
  const cid = auth.workspace_id;
  const route = req.query?.route;

  // ── GET /api/leads/stale ─────────────────────────────────
  if (req.method === "GET" && route === "stale") {
    const statuses  = String(req.query?.status || "Novo,Em atendimento").split(",").map(s => s.trim()).filter(Boolean);
    const staleMin  = Math.max(1, Math.min(1440, parseInt(req.query?.stale_minutes || "60") || 60));
    const limit     = Math.max(1, Math.min(100,  parseInt(req.query?.limit || "30") || 30));
    const threshold = new Date(Date.now() - staleMin * 60 * 1000).toISOString();

    const { data, error } = await sb.from("leads")
      .select("id,name,phone,status,instance,last_message_at,created_at")
      .eq("client_id", cid).in("status", statuses)
      .or(`last_message_at.lt.${threshold},last_message_at.is.null`)
      .order("last_message_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) return fail(res, "STALE_LEADS_FAILED", 500, { details: error });
    const leads = data ?? [];
    return ok(res, { data: leads, count: leads.length, stale_minutes: staleMin, threshold });
  }

  // ── PATCH /api/leads/:id/followup ─────────────────────────
  if (req.method === "PATCH" && route === "followup") {
    const lead_id = req.query?.id;
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);
    const b = req.body || {};
    const followup_sent_at = b?.followup_sent_at || new Date().toISOString();
    const followup_text    = b?.followup_text || null;

    let { data, error } = await sb.from("leads")
      .update({ last_message_at: followup_sent_at, followup_sent_at, followup_text })
      .eq("id", lead_id).eq("client_id", cid)
      .select("id,status,followup_sent_at").maybeSingle();

    if (["PGRST204","42703"].includes(error?.code)) {
      const r = await sb.from("leads").update({ last_message_at: followup_sent_at })
        .eq("id", lead_id).eq("client_id", cid).select("id,status").maybeSingle();
      data = r.data; error = r.error;
    }
    if (error) return fail(res, "FOLLOWUP_UPDATE_FAILED", 500, { details: error });
    if (!data)  return fail(res, "LEAD_NOT_FOUND", 404);
    return ok(res, { id: lead_id, status: data.status, followup_sent_at, followup_text, workspace_id: cid });
  }

  // ── GET /api/leads ────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await sb.from("leads").select("*").eq("client_id", cid).order("created_at", { ascending: false });
    if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });
    return ok(res, (data ?? []).map(mapLead));
  }

  // ── POST /api/leads ───────────────────────────────────────
  if (req.method === "POST") {
    const b = req.body || {};
    const s = safeStage(b?.status ?? b?.stage);
    const { data, error } = await sb.from("leads")
      .insert({ client_id: cid, name: b?.name ?? null, phone: b?.phone ?? null, status: s, tags: b?.tags ?? null })
      .select("*").maybeSingle();
    if (error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: error });
    return ok(res, mapLead(data), 201);
  }

  // ── PATCH /api/leads?id=:id ───────────────────────────────
  if (req.method === "PATCH") {
    const lead_id = req.query?.id;
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);
    const status = safeStage(req.body?.status ?? req.body?.stage);
    const { data, error } = await sb.from("leads").update({ status })
      .eq("id", lead_id).eq("client_id", cid).select("*").maybeSingle();
    if (error) return fail(res, "LEAD_UPDATE_FAILED", 500, { details: error });
    if (!data)  return fail(res, "LEAD_NOT_FOUND", 404);
    return ok(res, mapLead(data));
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
