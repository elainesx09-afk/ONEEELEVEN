// api/workspaces_onboard.ts
import { setCors, ok, fail } from "./_lib/response";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

function randomToken() {
  return `oneeleven_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  // Proteção: só você pode criar workspaces (usa um secret server-side)
  const adminSecret = process.env.ADMIN_ONBOARD_SECRET;
  if (!adminSecret) return fail(res, "MISSING_ADMIN_ONBOARD_SECRET", 500);

  const provided = req.headers["x-admin-secret"];
  if (!provided || provided !== adminSecret) return fail(res, "FORBIDDEN", 403);

  let body: any = {};
  try { body = req.body || {}; } catch { body = {}; }

  const name = String(body?.name || "").trim() || "Workspace";

  const sb = await supabaseAdmin();

  // cria workspace
  const { data: w, error: wErr } = await sb
    .from("workspaces")
    .insert({ name })
    .select("id,name,created_at")
    .maybeSingle();

  if (wErr) return fail(res, "WORKSPACE_CREATE_FAILED", 500, { details: wErr });
  if (!w) return fail(res, "WORKSPACE_CREATE_FAILED", 500);

  // cria token
  const token = randomToken();
  const { data: t, error: tErr } = await sb
    .from("api_tokens")
    .insert({ token, workspace_id: w.id, label: "primary", is_active: true })
    .select("token,workspace_id,is_active,created_at")
    .maybeSingle();

  if (tErr) return fail(res, "TOKEN_CREATE_FAILED", 500, { details: tErr });

  return ok(res, {
    workspace: w,
    api: {
      token: t?.token,
      workspace_id: t?.workspace_id,
    },
  }, 201);
}
