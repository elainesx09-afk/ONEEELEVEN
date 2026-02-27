// GET   /api/instances           → lista instâncias
// POST  /api/instances           → registra instância (ONBOARD_INSTANCE)
// PATCH /api/instances?name=:n   → atualiza status
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb  = await supabaseAdmin();
  const cid = auth.workspace_id;

  if (req.method === "GET") {
    const { data, error } = await sb.from("instances").select("*")
      .eq("client_id", cid).order("created_at", { ascending: false });
    if (error?.code === "42P01") return ok(res, []);
    if (error) return fail(res, "INSTANCES_FETCH_FAILED", 500, { details: error });
    return ok(res, data ?? []);
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const instance_name = String(b?.instance_name || "").trim();
    if (!instance_name) return fail(res, "MISSING_INSTANCE_NAME", 400);

    const payload = {
      client_id: cid, instance_name,
      status: b?.status || "qrcode",
      qr_base64: b?.qr_base64 || null,
      qr_code_url: b?.qr_code_url || null,
      evo_instance_id: b?.evo_instance_id || null,
      created_at: b?.created_at || new Date().toISOString(),
    };

    const { data, error } = await sb.from("instances")
      .upsert(payload, { onConflict: "client_id,instance_name" })
      .select("*").maybeSingle();

    if (error?.code === "42P01") {
      console.warn("[INSTANCES] Tabela ausente. Execute MIGRATION_v2.sql");
      return ok(res, { ...payload, warning: "instances_table_missing" }, 201);
    }
    if (error) return fail(res, "INSTANCE_INSERT_FAILED", 500, { details: error });
    return ok(res, data ?? payload, 201);
  }

  if (req.method === "PATCH") {
    const name = req.query?.name || req.query?.instance;
    if (!name) return fail(res, "MISSING_INSTANCE_NAME", 400);
    const b = req.body || {};
    const { data, error } = await sb.from("instances")
      .update({ status: b?.status || "open", qr_base64: b?.qr_base64 ?? null, updated_at: new Date().toISOString() })
      .eq("client_id", cid).eq("instance_name", name).select("*").maybeSingle();
    if (error) return fail(res, "INSTANCE_UPDATE_FAILED", 500, { details: error });
    if (!data)  return fail(res, "INSTANCE_NOT_FOUND", 404);
    return ok(res, data);
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
