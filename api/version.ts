// api/version.ts
import { setCors, ok, fail } from "./_lib/response";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const token = String(req.headers["x-api-token"] || "").trim();
    const workspaceId = String(req.headers["workspace_id"] || "").trim();

    const sb = await supabaseAdmin();

    // base info (sempre)
    const base: any = {
      name: "one-eleven-api",
      now: new Date().toISOString(),
      sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      env: process.env.VERCEL_ENV || null,
      headers: {
        token_present: !!token,
        workspace_present: !!workspaceId,
        workspace_id_received: workspaceId || null,
        token_prefix: token ? token.slice(0, 10) : null,
      },
      envs_present: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      tenant: {
        token_valid: false,
        workspace_valid_for_token: false,
      },
      workspaces: [] as Array<{ id: string; name: string; created_at?: string | null }>,
    };

    // Sem token: devolve só o base
    if (!token) return ok(res, base);

    // Lista workspaces permitidos pelo token (join)
    // Esperado:
    // api_tokens(token, workspace_id, is_active) -> FK workspace_id -> workspaces.id
    const { data, error } = await sb
      .from("api_tokens")
      .select("workspace_id, workspaces:workspaces(id,name,created_at)")
      .eq("token", token)
      .eq("is_active", true);

    if (error) return fail(res, "TOKEN_LOOKUP_FAILED", 500, { details: error });

    const rows = data ?? [];
    const list = rows
      .map((r: any) => {
        const w = r.workspaces;
        if (!w?.id) return null;
        return {
          id: String(w.id),
          name: String(w.name || "Workspace"),
          created_at: w.created_at ? String(w.created_at) : null,
        };
      })
      .filter(Boolean) as any[];

    base.tenant.token_valid = list.length > 0;
    base.workspaces = list;

    // Valida se o workspace_id atual pertence ao token
    if (workspaceId) {
      base.tenant.workspace_valid_for_token = list.some((w: any) => String(w.id) === workspaceId);
    }

    return ok(res, base);
  } catch (e: any) {
    return fail(res, "VERSION_CRASH", 500, { details: String(e?.message || e) });
  }
}
