// api/workspaces.ts
import { setCors, ok, fail } from "./_lib/response";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const token = req.headers["x-api-token"];
  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401);

  const sb = await supabaseAdmin();

  // pega quais workspaces esse token pode acessar
  const { data: rows, error } = await sb
    .from("api_tokens")
    .select("workspace_id")
    .eq("token", token)
    .eq("is_active", true);

  if (error) return fail(res, "TOKENS_FETCH_FAILED", 500, { details: error });

  const ids = Array.from(new Set((rows ?? []).map((r: any) => r.workspace_id).filter(Boolean)));
  if (ids.length === 0) return ok(res, []);

  const { data: workspaces, error: wErr } = await sb
    .from("workspaces")
    .select("id,name,created_at")
    .in("id", ids)
    .order("created_at", { ascending: true });

  if (wErr) return fail(res, "WORKSPACES_FETCH_FAILED", 500, { details: wErr });

  return ok(res, workspaces ?? []);
}
