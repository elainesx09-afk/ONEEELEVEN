// api/health.ts
import { setCors, ok, fail } from "./_lib/response";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const checks: any = {
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    },
    supabase: { ok: false },
  };

  // valida env primeiro
  if (!checks.env.SUPABASE_URL || !checks.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fail(res, "MISSING_SUPABASE_ENVS", 500, { checks });
  }

  try {
    const sb = await supabaseAdmin();

    // ping leve (sem depender do seu schema)
    const { data, error } = await sb.rpc("now");
    // se rpc("now") não existir, fazemos fallback:
    if (error) {
      // fallback: consulta na workspaces (se existir) só com count head
      const { error: e2 } = await sb
        .from("workspaces")
        .select("id", { count: "exact", head: true })
        .limit(1);

      if (e2) {
        checks.supabase = { ok: false, error: e2 };
        return fail(res, "SUPABASE_CONNECTION_FAILED", 500, { checks });
      }
      checks.supabase = { ok: true, mode: "fallback_table_head" };
      return ok(res, { checks });
    }

    checks.supabase = { ok: true, mode: "rpc_now", now: data };
    return ok(res, { checks });
  } catch (e: any) {
    checks.supabase = { ok: false, error: String(e?.message || e) };
    return fail(res, "HEALTH_CRASH", 500, { checks });
  }
}
