// api/version.ts
import { setCors } from "./_lib/response";

export default function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const token = req.headers["x-api-token"] || null;
    const workspace_id = req.headers["workspace_id"] || null;

    // NÃO chama Supabase aqui. Só valida presença de envs e headers.
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
          API_TOKEN: Boolean(process.env.API_TOKEN), // se você usa isso no backend
        },
      },
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "VERSION_CRASH",
      details: String(e?.message || e),
    });
  }
}
