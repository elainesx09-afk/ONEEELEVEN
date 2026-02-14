// api/leads.ts
import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

const ALLOWED_STAGES = new Set([
  "Novo",
  "Em atendimento",
  "Qualificado",
  "Agendado",
  "Fechado",
  "Perdido",
]);

function normalizeStage(v: any) {
  const s = String(v || "Novo").trim();
  return ALLOWED_STAGES.has(s) ? s : "Novo";
}

function parseBody(req: any) {
  const raw = req?.body;

  if (!raw) return {};
  if (typeof raw === "object") return raw;

  // Vercel costuma entregar string
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  return {};
}

// Lista segura (evita vazar campos futuros)
const LEADS_SELECT =
  "id, client_id, name, phone, notes, status, tags, score, source, last_message, last_message_at, created_at, updated_at";

const mapLead = (l: any) => ({
  ...l,
  workspace_id: l.client_id,
  stage: normalizeStage(l.status),
  status: normalizeStage(l.status),
});

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  if (req.method === "GET") {
    const { data, error } = await sb
      .from("leads")
      .select(LEADS_SELECT)
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });
    return ok(res, (data ?? []).map(mapLead));
  }

  if (req.method === "POST") {
    const body = parseBody(req);

    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    if (!name) return fail(res, "MISSING_NAME", 400);
    if (!phone) return fail(res, "MISSING_PHONE", 400);

    const notes = body?.notes ?? null;
    const tags = body?.tags ?? null;

    const status = normalizeStage(body?.status ?? body?.stage ?? "Novo");

    const payload: any = {
      client_id,
      name,
      phone,
      notes,
      status,
      tags,
    };

    // opcionais (se existirem no schema)
    if (body?.score !== undefined) payload.score = body.score;
    if (body?.source !== undefined) payload.source = body.source;

    const { data, error } = await sb
      .from("leads")
      .insert(payload)
      .select(LEADS_SELECT)
      .maybeSingle();

    if (error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: error });

    return ok(res, mapLead(data), 201);
  }

  if (req.method === "PATCH") {
    const leadId = req.query?.id;
    if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

    const body = parseBody(req);

    const stageOrStatus = body?.status ?? body?.stage;
    if (!stageOrStatus) return fail(res, "MISSING_STAGE", 400);

    const status = normalizeStage(stageOrStatus);

    const update: any = { status };

    // updates permitidos (sem abrir geral)
    if (body?.name !== undefined) update.name = body.name;
    if (body?.phone !== undefined) update.phone = body.phone;
    if (body?.notes !== undefined) update.notes = body.notes;
    if (body?.tags !== undefined) update.tags = body.tags;

    const { data, error } = await sb
      .from("leads")
      .update(update)
      .eq("id", leadId)
      .eq("client_id", client_id)
      .select(LEADS_SELECT)
      .maybeSingle();

    if (error) return fail(res, "LEAD_UPDATE_FAILED", 500, { details: error });
    if (!data) return fail(res, "LEAD_NOT_FOUND", 404);

    return ok(res, mapLead(data));
  }

  return fail(res, "METHOD_NOT_ALLOWED", 405);
}
