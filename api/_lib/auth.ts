// api/_lib/auth.ts
import { supabaseAdmin } from "./supabaseAdmin.ts";
import { fail } from "./response.ts";

function headerValue(req: any, name: string): string | null {
  const v = req?.headers?.[name];
  if (!v) return null;
  if (Array.isArray(v)) return String(v[0] ?? "").trim() || null;
  return String(v).trim() || null;
}

export type AuthContext = {
  workspace_id: string;
  token: string;
};

export async function requireAuth(req: any, res: any): Promise<AuthContext | void> {
  const token = headerValue(req, "x-api-token");
  const workspaceId = headerValue(req, "workspace_id");

  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401);
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 401);

  let sb: any;
  try {
    sb = await supabaseAdmin();
  } catch (e: any) {
    return fail(res, "AUTH_SUPABASE_INIT_FAILED", 500, {
      details: String(e?.message || e),
    });
  }

  try {
    const { data, error } = await sb
      .from("api_tokens")
      .select("token, workspace_id, is_active")
      .eq("token", token)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return fail(res, "AUTH_QUERY_FAILED", 500, {
        details: error,
      });
    }
    if (!data) return fail(res, "INVALID_TOKEN_OR_WORKSPACE", 403);

    return { workspace_id: String(data.workspace_id), token: String(data.token) };
  } catch (e: any) {
    return fail(res, "AUTH_RUNTIME_CRASH", 500, {
      details: String(e?.message || e),
    });
  }
}
