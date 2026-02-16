// api/workspaces.ts
import { setCors, ok, fail } from "./_lib/response";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const token = req.headers["x-api-token"];
  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401);

  const sb = await supabaseAdmin();

  // MVP: token pode acessar workspaces via api_tokens
  const { data: toks, error: tokErr } = await sb
    .from("api_tokens")
    .select("workspace_id, is_active")
    .eq("token", token)
    .eq("is_active", true);

  if (tokErr) return fail(res, "TOKENS_QUERY_FAILED", 500, { details: tokErr });
  const workspaceIds = (toks ?? []).map((t: any) => t.workspace_id).filter(Boolean);

  if (workspaceIds.length === 0) {
    return ok(res, []);
  }

  const { data: wss, error: wsErr } = await sb
    .from("workspaces")
    .select("id, name, created_at")
    .in("id", workspaceIds)
    .order("created_at", { ascending: true });

  if (wsErr) return fail(res, "WORKSPACES_QUERY_FAILED", 500, { details: wsErr });

  // formato compatível com o seu WorkspaceContext
  const mapped = (wss ?? []).map((w: any) => ({
    id: w.id,
    name: w.name ?? "Workspace",
    niche: "Workspace",
    timezone: "America/Sao_Paulo",
    status: "active",
    instances: 0,
    leads: 0,
    conversions: 0,
    lastActivity: "—",
    createdAt: w.created_at ?? new Date().toISOString(),
  }));

  return ok(res, mapped);
}
