// api/diag.ts
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

    const libDir = path.join(__dirname, "_lib");

    const files = fs.existsSync(libDir) ? fs.readdirSync(libDir) : [];

    async function tryImport(rel: string) {
      try {
        const mod: any = await import(rel);
        return { ok: true, keys: Object.keys(mod || {}) };
      } catch (e: any) {
        return {
          ok: false,
          error: String(e?.message || e),
          stack: e?.stack ? String(e.stack).slice(0, 1200) : null,
        };
      }
    }

    // tenta importar os módulos críticos
    const supabaseAdmin = await tryImport("./_lib/supabaseAdmin");
    const auth = await tryImport("./_lib/auth");
    const response = await tryImport("./_lib/response");

    return res.status(200).json({
      ok: true,
      runtime: {
        dirname: __dirname,
        libDir,
        libFiles: files,
      },
      imports: {
        supabaseAdmin,
        auth,
        response,
      },
      envs_present: {
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "DIAG_CRASH",
      details: String(e?.message || e),
      stack: e?.stack ? String(e.stack).slice(0, 1200) : null,
    });
  }
}
