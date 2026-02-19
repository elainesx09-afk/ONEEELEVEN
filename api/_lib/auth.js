// api/_lib/auth.js
import { supabaseAdmin } from "./supabaseAdmin.js";
import { fail } from "./response.js";

export async function requireAuth(req, res) {
  const token = req.headers["x-api-token"];
  const workspaceId = req.headers["workspace_id"];

  const meta = {
    token_present: !!token,
    workspace_present: !!workspaceId,
    workspace_id_received: workspaceId ? String(workspaceId) : null,
    token_prefix: token ? String(token).slice(0, 8) : null,
  };

  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401, meta);
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 401, meta);

  const sb = await supabaseAdmin();

  const { data, error } = await sb
    .from("api_tokens")
    .select("token, workspace_id, is_active")
    .eq("token", token)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return fail(res, "AUTH_QUERY_FAILED", 500, { ...meta, details: error });
  if (!data) return fail(res, "INVALID_TOKEN_OR_WORKSPACE", 403, meta);

  return { workspace_id: String(workspaceId), token: String(token) };
}
