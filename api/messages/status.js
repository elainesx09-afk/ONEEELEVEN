// api/messages/status.js
// ============================================================
// OBJETIVO: Atualizar status de leitura de mensagem via external_id
// MÉTODO  : PATCH
// SEGURANÇA: requireAuth + client_id (multi-tenant inegociável)
// CHAMADO POR: MESSAGE_STATUS_SYNC v2 (Evolution → n8n → aqui)
// BODY: { external_id, status: "read", read_at: ISO, updated_at: ISO }
// ============================================================

import { setCors, ok, fail } from "../_lib/response.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

const ALLOWED_STATUSES = new Set(["sent", "delivered", "read", "failed"]);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "PATCH") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const external_id = body?.external_id ? String(body.external_id).trim() : null;
  const status      = body?.status && ALLOWED_STATUSES.has(body.status) ? body.status : "read";
  const read_at     = body?.read_at || new Date().toISOString();

  if (!external_id) return fail(res, "MISSING_EXTERNAL_ID", 400);

  // ---- Verifica se a mensagem existe e pertence ao workspace ----
  const { data: existing, error: lookupErr } = await sb
    .from("messages")
    .select("id, client_id, lead_id, status, read_at")
    .eq("client_id", client_id)
    .eq("external_id", external_id)
    .maybeSingle();

  if (lookupErr && lookupErr.code !== "PGRST116") {
    return fail(res, "MESSAGE_LOOKUP_FAILED", 500, { details: lookupErr });
  }

  // Se não encontrou, pode ser mensagem ainda não ingestada — retorna 200 silencioso
  if (!existing) {
    console.warn(JSON.stringify({
      level: "WARN",
      route: "/api/messages/status",
      workspace_id: client_id,
      external_id,
      note: "Mensagem não encontrada — pode ter sido descartada ou external_id errado",
    }));
    return ok(res, { updated: false, reason: "message_not_found", external_id });
  }

  // Se já está como "read", idempotente — não precisa atualizar
  if (existing.status === "read" && existing.read_at) {
    return ok(res, { updated: false, reason: "already_read", id: existing.id, external_id });
  }

  // ---- Atualiza status + read_at ----
  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "read") updates.read_at = read_at;

  const { data, error } = await sb
    .from("messages")
    .update(updates)
    .eq("id", existing.id)
    .eq("client_id", client_id)       // double-guard multi-tenant
    .select("id, lead_id, status, read_at, external_id, updated_at")
    .maybeSingle();

  if (error) return fail(res, "MESSAGE_STATUS_UPDATE_FAILED", 500, { details: error });
  if (!data) return fail(res, "MESSAGE_UPDATE_RETURNED_EMPTY", 500);

  console.log(JSON.stringify({
    level: "INFO",
    route: "/api/messages/status",
    workspace_id: client_id,
    message_id: data.id,
    lead_id: data.lead_id,
    external_id,
    status,
    read_at,
    event: "read_synced",
  }));

  return ok(res, { ...data, workspace_id: client_id, updated: true });
}
