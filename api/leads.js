import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

const ALLOWED = new Set([
  "Novo",
  "Em atendimento",
  "Qualificado",
  "Agendado",
  "Fechado",
  "Perdido"
]);

function normalizeStage(v) {
  const s = String(v || "Novo").trim();
  return ALLOWED.has(s) ? s : "Novo";
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  if (req.method === "GET") {
    const { data, error } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });

    const mapped = (data ?? []).map((l) => ({
      ...l,
      workspace_id: l.client_id,                 // compat UI
      stage: normalizeStage(l.status || l.stage) // pipeline
    }));

    return ok(res, mapped);
  }

  if (req.method === "POST") {
    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const name = body?.name ?? null;
    const phone = body?.phone ?? null;

    // NÃO usa "notes" (você já tomou PGRST204)
    const status = normalizeStage(body?.status ?? body?.stage ?? "Novo");
    const tags = body?.tags ?? null;

    const payload = { client_id, name, phone, status, tags };

    const { data, error } = await sb
      .from("leads")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: error });

    return ok(res, {
      ...data,
      workspace_id: data.client_id,
      stage: normalizeStage(data.status || data.stage)
    }, 201);
  }

  if (req.method === "PATCH") {
    const leadId = req.query?.id;
    if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const status = normalizeStage(body?.status ?? body?.stage);
    if (!status) return fail(res, "MISSING_STAGE", 400);

    const { data, error } = await sb
      .from("leads")
      .update({ status })
      .eq("id", leadId)
      .eq("client_id", client_id)
      .select("*")
      .maybeSingle();

    if (error) return fail(res, "LEAD_UPDATE_FAILED", 500, { details: error });
    if (!data) return fail(res, "LEAD_NOT_FOUND", 404);

    return ok(res, {
      ...data,
      workspace_id: data.client_id,
      stage: normalizeStage(data.status || data.stage)
    });
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
