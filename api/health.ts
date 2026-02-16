// api/health.ts
import fs from "node:fs";
import path from "node:path";

function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, workspace_id");
}

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

async function tryImport(spec: string) {
  try {
    const mod = await import(spec);
    return { ok: true, keys: Object.keys(mod || {}) };
  } catch (e: any) {
    return {
      ok: false,
      error: String(e?.message || e),
      name: e?.name || null,
      stack: String(e?.stack || ""),
    };
  }
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const out: any = {
    ok: true,
    now: new Date().toISOString(),
    env: {
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      SUPABASE_URL_present: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    runtime: {},
    imports: {},
    supabase: {},
  };

  // 1) runtime dirs/files
  try {
    const apiDir = "/var/task/api";
    const libDir1 = "/var/task/api/_lib";
    const libDir2 = "/var/task/api/lib";

    out.runtime = {
      apiDir,
      apiFiles: fs.existsSync(apiDir) ? fs.readdirSync(apiDir).slice(0, 50) : [],
      libDir_guess_1: libDir1,
      libFiles_guess_1: fs.existsSync(libDir1) ? fs.readdirSync(libDir1).slice(0, 50) : [],
      libDir_guess_2: libDir2,
      libFiles_guess_2: fs.existsSync(libDir2) ? fs.readdirSync(libDir2).slice(0, 50) : [],
    };
  } catch (e: any) {
    out.runtime = { ok: false, error: String(e?.message || e) };
  }

  // 2) try import _lib modules (com extensão .js e sem extensão)
  // OBS: No runtime Vercel, seus TS viram JS. Se você estiver em ESM, extensão pode ser obrigatória.
  out.imports.response_js = await tryImport("./_lib/response.js");
  out.imports.auth_js = await tryImport("./_lib/auth.js");
  out.imports.supabaseAdmin_js = await tryImport("./_lib/supabaseAdmin.js");

  out.imports.response_noext = await tryImport("./_lib/response");
  out.imports.auth_noext = await tryImport("./_lib/auth");
  out.imports.supabaseAdmin_noext = await tryImport("./_lib/supabaseAdmin");

  // 3) Supabase direct (não usa seu supabaseAdmin)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    out.ok = false;
    out.supabase = { ok: false, error: "MISSING_SUPABASE_ENVS" };
    return json(res, 500, out);
  }

  const supabaseJs = await tryImport("@supabase/supabase-js");
  out.imports.supabase_js_lib = supabaseJs;

  if (!supabaseJs.ok) {
    out.ok = false;
    out.supabase = { ok: false, error: "CANNOT_IMPORT_SUPABASE_JS" };
    return json(res, 500, out);
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ping leve: tenta contar workspaces (se não existir, vai acusar schema)
    const { error } = await sb.from("workspaces").select("id", { head: true, count: "exact" }).limit(1);

    out.supabase = error
      ? { ok: false, error }
      : { ok: true, mode: "workspaces_head_count" };

    if (error) out.ok = false;
    return json(res, error ? 500 : 200, out);
  } catch (e: any) {
    out.ok = false;
    out.supabase = { ok: false, crash: String(e?.message || e), stack: String(e?.stack || "") };
    return json(res, 500, out);
  }
}
