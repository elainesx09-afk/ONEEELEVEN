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
  // normaliza headers
  const token = headerValue(req, "x-api-token");
  const workspaceId = headerValue(req, "workspace_id");

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

  // Fonte de verdade = workspace_id do banco (não do header)
  return { workspace_id: String(data.workspace_id), token: String(data.token) };
}
