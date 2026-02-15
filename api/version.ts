// api/version.ts
export default function handler(req: any, res: any) {
  try {
    // CORS (sem depender de _lib)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-api-token, workspace_id"
    );

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const token = req.headers["x-api-token"] || null;
    const workspace_id = req.headers["workspace_id"] || null;

    return res.status(200).json({
      ok: true,
      data: {
        name: "one-eleven-api",
        now: new Date().toISOString(),
        sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        branch: process.env.VERCEL_GIT_COMMIT_REF || null,
        env: process.env.VERCEL_ENV || null,
        headers: {
          token_present: Boolean(token),
          workspace_present: Boolean(workspace_id),
          workspace_id_received: workspace_id,
          token_prefix: token ? String(token).slice(0, 12) + "..." : null,
        },
        envs_present: {
          SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          API_TOKEN: Boolean(process.env.API_TOKEN),
        },
      },
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "VERSION_CRASH",
      details: String(e?.message || e),
      stack: e?.stack ? String(e.stack).slice(0, 800) : null,
    });
  }
}
