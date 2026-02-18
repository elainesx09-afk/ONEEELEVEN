import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

function normalizePhone(v) {
  return String(v || "").trim().replace(/\D+/g, "");
}

const ALLOWED_STATUS = new Set([
  "Novo",
  "Em atendimento",
  "Qualificado",
  "Agendado",
  "Fechado",
  "Perdido",
]);

function safeStatus(v) {
  const s = String(v || "Novo").trim();
  return ALLOWED_STATUS.has(s) ? s : "Novo";
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  // GET no navegador só pra debug
  if (req.method === "GET") {
    return ok(res, {
      route: "/api/inbound",
      note: "Use POST para inbound real",
      envs_present: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  // auth normal por token/workspace (MVP)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const phone = normalizePhone(body?.lead?.phone);
  const name = body?.lead?.name ? String(body.lead.name) : null;
  const status = safeStatus(body?.lead?.status || body?.lead?.stage || "Novo");

  const msgBody = body?.message?.body ? String(body.message.body) : null;
  const direction = body?.message?.direction === "out" ? "out" : "in";

  if (!phone) return fail(res, "MISSING_LEAD_PHONE", 400);
  if (!msgBody) return fail(res, "MISSING_MESSAGE_BODY", 400);

  // acha lead por client_id + phone
  const { data: existing, error: findErr } = await sb
    .from("leads")
    .select("id, name")
    .eq("client_id", client_id)
    .eq("phone", phone)
    .maybeSingle();

  if (findErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: findErr });

  let lead_id = existing?.id || null;

  if (!lead_id) {
    const { data: created, error: insErr } = await sb
      .from("leads")
      .insert({ client_id, name, phone, status })
      .select("*")
      .maybeSingle();

    if (insErr) return fail(res, "LEAD_INSERT_FAILED", 500, { details: insErr });
    lead_id = created?.id || null;
  }

  if (!lead_id) return fail(res, "LEAD_ID_MISSING_AFTER_UPSERT", 500);

  const { data: msg, error: msgErr } = await sb
    .from("messages")
    .insert({ client_id, lead_id, direction, body: msgBody })
    .select("*")
    .maybeSingle();

  if (msgErr) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msgErr });

  return ok(res, { client_id, lead_id, message_id: msg?.id || null }, 201);
}
