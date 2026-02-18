// api/inbound.ts
// INBOUND MVP: recebe payload (n8n/Evolution) e salva lead + message no Supabase.
//
// Segurança (recomendado):
// - Se INBOUND_SECRET existir nas envs, exige header: x-inbound-secret.
// - Se não existir, exige auth normal (x-api-token + workspace_id).

import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

type InboundPayload = {
  workspace_id?: string;
  lead?: { name?: string | null; phone?: string | null; status?: string | null; stage?: string | null };
  message?: { body?: string | null; direction?: "in" | "out" | null; created_at?: string | null };
  [k: string]: any;
};

function normalizePhone(v: any) {
  return String(v || "").trim().replace(/\D+/g, "");
}

// Ajuste fino: tem check constraint no seu banco.
// Mantém só o que é permitido e cai pra "Novo" caso venha diferente.
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

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const inboundSecret = String(process.env.INBOUND_SECRET || "").trim();
  if (inboundSecret) {
    const received = String(req.headers["x-inbound-secret"] || "").trim();
    if (!received) return fail(res, "MISSING_INBOUND_SECRET", 401);
    if (received !== inboundSecret) return fail(res, "INVALID_INBOUND_SECRET", 403);
  }

  // workspace_id
  let workspace_id: string | null = null;

  // Se não tiver secret, exige headers normais
  if (!inboundSecret) {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    workspace_id = auth.workspace_id;
  }

  let body: InboundPayload = {} as any;
  try { body = (req.body || {}) as any; } catch { body = {} as any; }

  if (body.workspace_id) workspace_id = String(body.workspace_id);
  if (!workspace_id) return fail(res, "MISSING_WORKSPACE_ID", 400);

  const client_id = workspace_id;

  const sb = await supabaseAdmin();

  // LEAD
  const phone = normalizePhone(body?.lead?.phone);
  if (!phone) return fail(res, "MISSING_LEAD_PHONE", 400);

  const name = body?.lead?.name ? String(body.lead.name) : null;
  const status = safeStatus(body?.lead?.status || body?.lead?.stage || "Novo");

  // 1) tenta achar lead existente por (client_id + phone)
  const { data: existing, error: findErr } = await sb
    .from("leads")
    .select("id, name")
    .eq("client_id", client_id)
    .eq("phone", phone)
    .maybeSingle();

  if (findErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: findErr });

  let lead_id: string | null = existing?.id || null;

  // 2) cria se não existe
  if (!lead_id) {
    const { data: created, error: insErr } = await sb
      .from("leads")
      .insert({
        client_id,
        name,
        phone,
        status,
      })
      .select("*")
      .maybeSingle();

    if (insErr) return fail(res, "LEAD_INSERT_FAILED", 500, { details: insErr });
    lead_id = created?.id || null;
  } else {
    // opcional: preencher nome se tava vazio
    if (name && (!existing?.name || String(existing.name).trim() === "")) {
      await sb.from("leads").update({ name }).eq("id", lead_id).eq("client_id", client_id);
    }
  }

  if (!lead_id) return fail(res, "LEAD_ID_MISSING_AFTER_UPSERT", 500);

  // MESSAGE
  const msgBody = body?.message?.body ? String(body.message.body) : null;
  if (!msgBody) return fail(res, "MISSING_MESSAGE_BODY", 400);

  const direction = body?.message?.direction === "out" ? "out" : "in";
  const created_at = body?.message?.created_at ? String(body.message.created_at) : null;

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
