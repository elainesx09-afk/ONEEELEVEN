// api/inbound.ts (DEBUG + MVP)
// - GET: healthcheck no navegador (não crasha)
// - POST: inbound real (com secret opcional)
// - Nunca deixa crashar sem JSON (retorna fail com debug)

import { setCors, ok, fail } from "./_lib/response";

function normalizePhone(v: any) {
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

function safeStatus(v: any) {
  const s = String(v || "Novo").trim();
  return ALLOWED_STATUS.has(s) ? s : "Novo";
}

async function getSupabase() {
  // import dinâmico pra não derrubar a function se o path estiver errado
  try {
    const mod = await import("./_lib/supabaseAdmin");
    return { ok: true as const, supabaseAdmin: mod.supabaseAdmin };
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message || e), stack: String(e?.stack || "") };
  }
}

async function getAuth() {
  try {
    const mod = await import("./_lib/auth");
    return { ok: true as const, requireAuth: mod.requireAuth };
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message || e), stack: String(e?.stack || "") };
  }
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const envs = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    INBOUND_SECRET: !!String(process.env.INBOUND_SECRET || "").trim(),
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
  };

  // ✅ GET: teste no navegador (não deveria ser 500)
  if (req.method === "GET") {
    const sb = await getSupabase();
    const au = await getAuth();

    return ok(res, {
      route: "/api/inbound",
      method: "GET",
      envs,
      imports: {
        supabaseAdmin: sb.ok ? "ok" : { ok: false, error: sb.error },
        auth: au.ok ? "ok" : { ok: false, error: au.error },
      },
      note: "POST required for real inbound. Use x-inbound-secret if INBOUND_SECRET is set.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  // imports
  const sbImp = await getSupabase();
  if (!sbImp.ok) return fail(res, "IMPORT_SUPABASEADMIN_FAILED", 500, { details: sbImp });

  const inboundSecret = String(process.env.INBOUND_SECRET || "").trim();
  let workspace_id: string | null = null;

  // se tiver secret, exige secret
  if (inboundSecret) {
    const received = String(req.headers["x-inbound-secret"] || "").trim();
    if (!received) return fail(res, "MISSING_INBOUND_SECRET", 401);
    if (received !== inboundSecret) return fail(res, "INVALID_INBOUND_SECRET", 403);
  } else {
    // se não tiver secret, exige auth normal
    const auImp = await getAuth();
    if (!auImp.ok) return fail(res, "IMPORT_AUTH_FAILED", 500, { details: auImp });

    const auth = await auImp.requireAuth(req, res);
    if (!auth) return;
    workspace_id = auth.workspace_id;
  }

  // body
  let body: any = {};
  try { body = req.body || {}; } catch { body = {}; }

  if (body.workspace_id) workspace_id = String(body.workspace_id);
  if (!workspace_id) return fail(res, "MISSING_WORKSPACE_ID", 400);

  const client_id = workspace_id;

  const phone = normalizePhone(body?.lead?.phone);
  if (!phone) return fail(res, "MISSING_LEAD_PHONE", 400);

  const name = body?.lead?.name ? String(body.lead.name) : null;
  const status = safeStatus(body?.lead?.status || body?.lead?.stage || "Novo");

  const msgBody = body?.message?.body ? String(body.message.body) : null;
  if (!msgBody) return fail(res, "MISSING_MESSAGE_BODY", 400);

  const direction = body?.message?.direction === "out" ? "out" : "in";
  const created_at = body?.message?.created_at ? String(body.message.created_at) : null;

  const sb = await sbImp.supabaseAdmin();

  // lookup lead
  const { data: existing, error: findErr } = await sb
    .from("leads")
    .select("id, name")
    .eq("client_id", client_id)
    .eq("phone", phone)
    .maybeSingle();

  if (findErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: findErr });

  let lead_id: string | null = existing?.id || null;

  if (!lead_id) {
    const { data: created, error: insErr } = await sb
      .from("leads")
      .insert({ client_id, name, phone, status })
      .select("*")
      .maybeSingle();

    if (insErr) return fail(res, "LEAD_INSERT_FAILED", 500, { details: insErr });
    lead_id = created?.id || null;
  } else {
    if (name && (!existing?.name || String(existing.name).trim() === "")) {
      await sb.from("leads").update({ name }).eq("id", lead_id).eq("client_id", client_id);
    }
  }

  if (!lead_id) return fail(res, "LEAD_ID_MISSING_AFTER_UPSERT", 500);

  const { data: msg, error: msgErr } = await sb
    .from("messages")
    .insert({
      client_id,
      lead_id,
      direction,
      body: msgBody,
      ...(created_at ? { created_at } : {}),
    })
    .select("*")
    .maybeSingle();

  if (msgErr) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msgErr });

  return ok(res, { workspace_id: client_id, lead_id, message_id: msg?.id || null }, 201);
}
