// api/health.ts
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, workspace_id");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const path = await import("node:path");
    const url = await import("node:url");
    const fs = await import("node:fs");

    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const apiDir = __dirname;                 // /var/task/api
    const libDir = path.join(__dirname, "lib"); // /var/task/api/lib

    const apiFiles = fs.existsSync(apiDir) ? fs.readdirSync(apiDir) : [];
    const libFiles = fs.existsSync(libDir) ? fs.readdirSync(libDir) : [];

    async function tryImport(rel: string) {
      try {
        const mod: any = await import(rel);
        return { ok: true, keys: Object.keys(mod || {}) };
      } catch (e: any) {
        return {
          ok: false,
          error: String(e?.message || e),
          stack: e?.stack ? String(e.stack).slice(0, 1400) : null,
        };
      }
    }

    const impResponse = await tryImport("./lib/response");
    const impSupabase = await tryImport("./lib/supabaseAdmin");
    const impAuth = await tryImport("./lib/auth");

    return res.status(200).json({
      ok: true,
      runtime: {
        dirname: __dirname,
        apiDir,
        libDir,
        apiFiles,
        libFiles,
      },
      imports: {
        response: impResponse,
        supabaseAdmin: impSupabase,
        auth: impAuth,
      },
      envs_present: {
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "HEALTH_DIAG_CRASH",
      details: String(e?.message || e),
      stack: e?.stack ? String(e.stack).slice(0, 1400) : null,
    });
  }
}
