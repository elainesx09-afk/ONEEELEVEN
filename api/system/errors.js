// api/system/errors.js
// ============================================================
// OBJETIVO: Receber e listar erros críticos dos workflows n8n
// MÉTODOS : POST (registrar erro), GET (listar erros)
// SEGURANÇA: requireAuth + client_id (multi-tenant)
// CHAMADO POR: ERROR_HANDLER v2 → POST /api/system/errors
// ============================================================

import { setCors, ok, fail } from "../_lib/response.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

const ALLOWED_SEVERITIES = new Set(["CRITICAL", "WARNING", "INFO"]);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  // ============================================================
  // POST — Registra erro enviado pelo ERROR_HANDLER v2
  // ============================================================
  if (req.method === "POST") {
    let body = {};
    try { body = req.body || {}; } catch { body = {}; }

    const severity     = ALLOWED_SEVERITIES.has(body?.severity) ? body.severity : "WARNING";
    const workflow     = String(body?.workflow     || "unknown").substring(0, 200);
    const exec_id      = String(body?.exec_id      || "").substring(0, 100);
    const error_message = String(body?.error_message || "").substring(0, 2000);
    const workspace_id_payload = String(body?.workspace_id || client_id);
    const lead_id      = body?.lead_id      || null;
    const is_retryable = body?.is_retryable === true;
    const timestamp    = body?.timestamp    || new Date().toISOString();

    // Segurança: workspace_id_payload deve coincidir com o autenticado
    // (evita que um workspace registre erros de outro)
    if (workspace_id_payload !== client_id) {
      console.warn(`[SYSTEM_ERRORS] workspace_id mismatch: payload=${workspace_id_payload} auth=${client_id}`);
    }

    const payload = {
      client_id,
      severity,
      workflow,
      exec_id,
      error_message,
      lead_id,
      is_retryable,
      resolved: false,
      created_at: timestamp,
    };

    const { data, error } = await sb
      .from("system_errors")
      .insert(payload)
      .select("id, severity, workflow, created_at")
      .maybeSingle();

    if (error) {
      // Log no servidor mas não falha — o ERROR_HANDLER não deve travar por falha aqui
      console.error("[SYSTEM_ERRORS] Insert failed:", JSON.stringify(error));
      return ok(res, { logged: false, reason: error.message }, 200);
    }

    console.log(JSON.stringify({
      level: "INFO",
      route: "/api/system/errors",
      workspace_id: client_id,
      severity,
      workflow,
      error_id: data?.id,
      event: "error_logged",
    }));

    return ok(res, { logged: true, id: data?.id, severity, workflow }, 201);
  }

  // ============================================================
  // GET — Lista erros do workspace (para dashboard/alertas)
  // Params: ?severity=CRITICAL&resolved=false&limit=50
  // ============================================================
  if (req.method === "GET") {
    const severity = req.query?.severity;
    const resolved = req.query?.resolved;
    const limit    = Math.min(200, Math.max(1, parseInt(req.query?.limit || "50", 10)));

    let query = sb
      .from("system_errors")
      .select("id, severity, workflow, exec_id, error_message, lead_id, is_retryable, resolved, created_at")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (severity && ALLOWED_SEVERITIES.has(severity)) {
      query = query.eq("severity", severity);
    }

    if (resolved === "false") query = query.eq("resolved", false);
    if (resolved === "true")  query = query.eq("resolved", true);

    const { data, error } = await query;

    if (error) return fail(res, "SYSTEM_ERRORS_FETCH_FAILED", 500, { details: error });

    return ok(res, {
      errors: data ?? [],
      count: (data ?? []).length,
      workspace_id: client_id,
    });
  }

  // ============================================================
  // PATCH — Marcar erro como resolvido
  // ============================================================
  if (req.method === "PATCH") {
    const errorId = req.query?.id;
    if (!errorId) return fail(res, "MISSING_ERROR_ID", 400);

    const { data, error } = await sb
      .from("system_errors")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", errorId)
      .eq("client_id", client_id)
      .select("id, resolved")
      .maybeSingle();

    if (error) return fail(res, "ERROR_RESOLVE_FAILED", 500, { details: error });
    if (!data) return fail(res, "ERROR_NOT_FOUND", 404);

    return ok(res, data);
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
