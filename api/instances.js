// api/instances.js
// ============================================================
// OBJETIVO: Gerenciar conexões WhatsApp (Evolution API)
// MÉTODOS : GET (listar), POST (criar/registrar), PATCH (atualizar status)
// SEGURANÇA: requireAuth + client_id em TODAS as queries (multi-tenant)
// USADO POR: Onboard INSTANCE v2, Frontend Instances.tsx
// ============================================================

import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

const ALLOWED_STATUSES = new Set([
  "qrcode", "connecting", "connected", "disconnected", "close", "refused"
]);

function safeStatus(v) {
  const s = String(v || "disconnected").trim().toLowerCase();
  return ALLOWED_STATUSES.has(s) ? s : "disconnected";
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  // ============================================================
  // GET — Lista instâncias do workspace autenticado
  // ============================================================
  if (req.method === "GET") {
    const { data, error } = await sb
      .from("instances")
      .select("*")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (error) return fail(res, "INSTANCES_FETCH_FAILED", 500, { details: error });

    const mapped = (data ?? []).map((i) => ({
      ...i,
      workspace_id: i.client_id,
      status: safeStatus(i.status),
    }));

    return ok(res, mapped);
  }

  // ============================================================
  // POST — Registra nova instância (chamado pelo ONBOARD_INSTANCE v2)
  // Payload: { instance_name, status, qr_base64, qr_code_url, evo_instance_id }
  // ============================================================
  if (req.method === "POST") {
    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const instance_name = String(body?.instance_name || body?.instance || "").trim();
    if (!instance_name) return fail(res, "MISSING_INSTANCE_NAME", 400);

    const status       = safeStatus(body?.status);
    const qr_base64    = body?.qr_base64   || null;
    const qr_code_url  = body?.qr_code_url || null;
    const evo_id       = body?.evo_instance_id || null;

    // Upsert: se a instância já existe para este workspace, atualiza
    const { data: existing } = await sb
      .from("instances")
      .select("id")
      .eq("client_id", client_id)
      .eq("instance_name", instance_name)
      .maybeSingle();

    let result;

    if (existing) {
      result = await sb
        .from("instances")
        .update({ status, qr_base64, qr_code_url, evo_instance_id: evo_id, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("client_id", client_id)
        .select("*")
        .maybeSingle();
    } else {
      result = await sb
        .from("instances")
        .insert({
          client_id,
          instance_name,
          status,
          qr_base64,
          qr_code_url,
          evo_instance_id: evo_id,
          created_at: body?.created_at || new Date().toISOString(),
        })
        .select("*")
        .maybeSingle();
    }

    if (result.error) return fail(res, "INSTANCE_UPSERT_FAILED", 500, { details: result.error });

    return ok(res, { ...result.data, workspace_id: client_id }, existing ? 200 : 201);
  }

  // ============================================================
  // PATCH — Atualiza status de uma instância (connection webhook)
  // Query: ?instance_name=xxx  ou  ?id=xxx
  // Body: { status, qr_base64, qr_code_url }
  // ============================================================
  if (req.method === "PATCH") {
    const instanceName = req.query?.instance_name;
    const instanceId   = req.query?.id;

    if (!instanceName && !instanceId) {
      return fail(res, "MISSING_INSTANCE_NAME_OR_ID", 400);
    }

    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const updates = {};
    if (body?.status    !== undefined) updates.status      = safeStatus(body.status);
    if (body?.qr_base64 !== undefined) updates.qr_base64   = body.qr_base64;
    if (body?.qr_code_url !== undefined) updates.qr_code_url = body.qr_code_url;
    updates.updated_at = new Date().toISOString();

    let query = sb
      .from("instances")
      .update(updates)
      .eq("client_id", client_id);

    if (instanceId)   query = query.eq("id", instanceId);
    if (instanceName) query = query.eq("instance_name", instanceName);

    const { data, error } = await query.select("*").maybeSingle();

    if (error)  return fail(res, "INSTANCE_UPDATE_FAILED", 500, { details: error });
    if (!data)  return fail(res, "INSTANCE_NOT_FOUND", 404);

    return ok(res, { ...data, workspace_id: client_id });
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
