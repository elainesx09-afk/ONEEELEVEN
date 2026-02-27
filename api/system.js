// POST /api/system?route=errors  → registra erro (n8n ERROR_HANDLER)
// GET  /api/system?route=errors  → lista erros
// (via rewrite de /api/system/errors)
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb  = await supabaseAdmin();
  const cid = auth.workspace_id;

  if (req.method === "GET") {
    const limit = Math.min(100, parseInt(req.query?.limit || "50") || 50);
    const { data, error } = await sb.from("system_errors").select("*")
      .eq("workspace_id", cid).order("created_at", { ascending: false }).limit(limit);
    if (error?.code === "42P01") return ok(res, []);
    if (error) return fail(res, "ERRORS_FETCH_FAILED", 500, { details: error });
    return ok(res, data ?? []);
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const payload = {
      severity:      b?.severity || "WARNING",
      workflow:      b?.workflow || "unknown",
      exec_id:       b?.exec_id || null,
      error_message: String(b?.error_message || "").substring(0, 1000),
      workspace_id:  b?.workspace_id || cid,
      lead_id:       b?.lead_id || null,
      is_retryable:  !!b?.is_retryable,
      created_at:    b?.timestamp || new Date().toISOString(),
    };
    console.error(JSON.stringify({ level: "ERROR", source: "n8n_error_handler", ...payload }));
    try {
      const { error } = await sb.from("system_errors").insert(payload);
      if (error && error.code !== "42P01") console.warn("[SYSTEM_ERRORS] Persist failed:", error.message);
    } catch (_) { /* silencioso */ }
    return ok(res, { received: true, severity: payload.severity, workflow: payload.workflow });
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
