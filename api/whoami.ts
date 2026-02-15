// api/whoami.ts
import { setCors, ok, fail } from "./_lib/response.ts";
import { requireAuth } from "./_lib/auth.ts";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const token = req.headers["x-api-token"] || null;
  const workspace_id = req.headers["workspace_id"] || null;

  // valida de verdade (mesma lógica das outras rotas)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  return ok(res, {
    token_present: Boolean(token),
    workspace_present: Boolean(workspace_id),
    workspace_id: auth.workspace_id,
    token_prefix: String(auth.token || "").slice(0, 12) + "...",
  });
}
