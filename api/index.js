// GET /api          → info
// GET /api?r=health → health + supabase ping
// GET /api?r=version
// GET /api?r=whoami
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const r = req.query?.r;

  if (r === "health") {
    try {
      const sb = await supabaseAdmin();
      const { error } = await sb.from("api_tokens").select("token").limit(1);
      if (error && !["42P01","PGRST116"].includes(error.code))
        return fail(res, "SUPABASE_ERROR", 500, { details: error.message });
      return ok(res, { status: "OK", supabase: "CONNECTED", ts: new Date().toISOString() });
    } catch (e) {
      return fail(res, "SUPABASE_CONNECTION_FAILED", 500, { details: e.message });
    }
  }

  if (r === "version") {
    return ok(res, { version: "2.0.0", name: "ONE ELEVEN SaaS", env: process.env.VERCEL_ENV || "dev" });
  }

  if (r === "whoami") {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    return ok(res, { workspace_id: auth.workspace_id, token_prefix: String(auth.token).slice(0, 8) + "…" });
  }

  return ok(res, { name: "ONE ELEVEN SaaS API v2", status: "OK" });
}
