// api/version.ts
import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const token = req.headers["x-api-token"] || null;
  const workspace_id = req.headers["workspace_id"] || null;

  // tenta autenticar (mesma regra do resto da API)
  let authOk = false;
  let authWorkspace: string | null = null;
  let authError: any = null;

  try {
    const auth = await requireAuth(req, res);
    if (auth) {
      authOk = true;
      authWorkspace = auth.workspace_id;
    } else {
      // requireAuth já respondeu com fail(...)
      return;
    }
  } catch (e: any) {
    authError = String(e?.message || e);
  }

  return ok(res, {
    name: "one-eleven-api",
    now: new Date().toISOString(),
    sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    env: process.env.VERCEL_ENV || null,

    // debug headers + auth
    headers: {
      token_present: Boolean(token),
      workspace_present: Boolean(workspace_id),
      workspace_id_received: workspace_id,
      token_prefix: token ? String(token).slice(0, 12) + "..." : null,
    },
    auth: {
      ok: authOk,
      workspace_id: authWorkspace,
      error: authError,
    },
  });
}
