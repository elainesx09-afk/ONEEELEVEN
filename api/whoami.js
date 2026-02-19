import { setCors, ok } from "./lib/response.js";
import { requireAuth } from "./lib/auth.js";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  return ok(res, { workspace_id: auth.workspace_id, token_prefix: auth.token.slice(0, 6) });
}
