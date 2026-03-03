import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  if (req.method === "GET") {
    const { data } = await sb
      .from("instances")
      .select("*")
      .eq("client_id", client_id);

    return ok(res, data || []);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const instance_name = body.instance_name || "default";

    const { data: existing } = await sb
      .from("instances")
      .select("*")
      .eq("client_id", client_id)
      .eq("instance_name", instance_name)
      .maybeSingle();

    if (existing) return ok(res, existing);

    const { data, error } = await sb
      .from("instances")
      .insert({
        client_id,
        instance_name,
        status: "connected",
        created_at: new Date().toISOString()
      })
      .select("*")
      .maybeSingle();

    if (error) return fail(res, "INSTANCE_CREATE_FAILED");

    return ok(res, data, 201);
  }

  return fail(res, "METHOD_NOT_ALLOWED", 405);
}
