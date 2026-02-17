import { supabaseAdmin } from "./supabaseAdmin.js";
import { fail } from "./response.js";

export async function requireAuth(req, res) {
  const token = req.headers["x-api-token"];
  const workspaceId = req.headers["workspace_id"];

  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401);
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 401);

  const sb = await supabaseAdmin();

  const { data, error } = await sb
    .from("api_tokens")
    .select("token, workspace_id, is_active")
    .eq("token", token)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return fail(res, "AUTH_QUERY_FAILED", 500, { details: error });
  if (!data) return fail(res, "INVALID_TOKEN_OR_WORKSPACE", 403);

  return { workspace_id: String(workspaceId), token: String(token) };
}
