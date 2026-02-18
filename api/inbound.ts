// api/inbound.ts
// MVP: endpoint para receber eventos (n8n/Evolution) e salvar em Supabase.
// Segurança:
// - Se INBOUND_SECRET existir no ambiente, exige header: x-inbound-secret.
// - Caso contrário (DEV), permite usar x-api-token + workspace_id (requireAuth).

import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

type InboundPayload = {
  workspace_id?: string;
  lead?: {
    name?: string | null;
    phone?: string | null;
    status?: string | null;
    stage?: string | null;
  };
  message?: {
    id?: string | null;
    body?: string | null;
    direction?: "in" | "out" | null;
    created_at?: string | null;
  };
  [k: string]: any;
};

function normalizePhone(v: any) {
  const s = String(v || "").trim();
  return s.replace(/\D+/g, "");
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

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  // 1) Segurança por secret (produção)
  const inboundSecret = String(process.env.INBOUND_SECRET || "").trim();
  const receivedSecret = String(req.headers["x-inbound-secret"] || "").trim();
  if (inboundSecret) {
    if (!receivedSecret) return fail(res, "MISSING_INBOUND_SECRET", 401);
    if (receivedSecret !== inboundSecret) return fail(res, "INVALID_INBOUND_SECRET", 403);
  }

  // 2) workspace_id
  let workspace_id: string | null = null;

  // Se não tiver secret configurado, exige auth normal.
  if (!inboundSecret) {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    workspace_id = auth.workspace_id;
  }

  let body: InboundPayload = {} as any;
  try {
    body = (req.body || {}) as any;
  } catch {
    body = {} as any;
  }

  // Se veio no payload, ele ganha (quando usando INBOUND_SECRET)
  if (body.workspace_id) workspace_id = String(body.workspace_id);
  if (!workspace_id) return fail(res, "MISSING_WORKSPACE_ID", 400);

  const sb = await supabaseAdmin();
  const client_id = workspace_id;

  // 3) Lead
  const leadName = body?.lead?.name ? String(body.lead.name) : null;
  const leadPhone = normalizePhone(body?.lead?.phone);
  if (!leadPhone) return fail(res, "MISSING_LEAD_PHONE", 400);

  // 4) Upsert (client_id + phone)
  const { data: existingLead, error: leadFindErr } = await sb
    .from("leads")
    .select("id, name, phone, status")
    .eq("client_id", client_id)
    .eq("phone", leadPhone)
    .maybeSingle();

  if (leadFindErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: leadFindErr });

  let leadId = (existingLead?.id as string) || null;

  if (!leadId) {
    const { data: newLead, error: leadInsErr } = await sb
      .from("leads")
      .insert({
        client_id,
        name: leadName,
        phone: leadPhone,
        status: safeStatus(body?.lead?.status || body?.lead?.stage || "Novo"),
      })
      .select("*")
      .maybeSingle();

    if (leadInsErr) return fail(res, "LEAD_INSERT_FAILED", 500, { details: leadInsErr });
    leadId = (newLead?.id as string) || null;
  } else {
    // Atualiza nome se antes estava vazio
    if (leadName && (!existingLead?.name || String(existingLead.name).trim() === "")) {
      await sb.from("leads").update({ name: leadName }).eq("id", leadId).eq("client_id", client_id);
    }
  }

  if (!leadId) return fail(res, "LEAD_ID_MISSING_AFTER_UPSERT", 500);

  // 5) Mensagem
  const msgBody = body?.message?.body ? String(body.message.body) : null;
  if (!msgBody) return fail(res, "MISSING_MESSAGE_BODY", 400);

  const direction = body?.message?.direction === "out" ? "out" : "in";
  const createdAt = body?.message?.created_at ? String(body.message.created_at) : null;

  const { data: msg, error: msgErr } = await sb
    .from("messages")
    .insert({
      client_id,
      lead_id: leadId,
      direction,
      body: msgBody,
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    .select("*")
    .maybeSingle();

  if (msgErr) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msgErr });

  return ok(
    res,
    {
      workspace_id: client_id,
      lead_id: leadId,
      message_id: msg?.id || null,
    },
    201
  );
}
