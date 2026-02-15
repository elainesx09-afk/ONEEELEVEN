// api/_lib/auth.ts
import { supabaseAdmin } from "./supabaseAdmin";
import { fail } from "./response";

function hv(req: any, k: string) {
  const v = req?.headers?.[k];
  if (!v) return null;
  return Array.isArray(v) ? String(v[0] ?? "").trim() : String(v).trim();
}

export async function requireAuth(req: any, res: any) {
  const token = hv(req, "x-api-token");
  const workspaceId = hv(req, "workspace_id");

  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401);
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 401);

  let sb: any;
  try {
    sb = await supabaseAdmin();
  } catch (e: any) {
    return fail(res, "AUTH_SUPABASE_INIT_FAILED", 500, { details: String(e?.message || e) });
  }

  const { data, error } = await sb
    .from("api_tokens")
    .select("token, workspace_id, is_active")
    .eq("token", token)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return fail(res, "AUTH_QUERY_FAILED", 500, { details: error });
  if (!data) return fail(res, "INVALID_TOKEN_OR_WORKSPACE", 403);

  return { workspace_id: workspaceId as string, token: token as string };
}
