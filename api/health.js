import { setCors, ok, fail } from "./_lib/response.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    return ok(res, {
      ok: true,
      now: new Date().toISOString(),
      envs_present: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        VERCEL_ENV: process.env.VERCEL_ENV || null,
        sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      },
    });
  } catch (e) {
    return fail(res, "HEALTH_FAILED", 500, { details: String(e?.message || e) });
  }
}
