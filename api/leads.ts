// api/leads.ts
import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const workspace_id = auth.workspace_id;

  if (req.method === "GET") {
    const { data, error } = await sb
      .from("leads")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false });

    if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });
    return ok(res, data ?? []);
  }

  if (req.method === "PATCH") {
    const leadId = req.query?.id;
    if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

    let body: any = {};
    try { body = req.body || {}; } catch { body = {}; }

    const stage = body?.stage;
    if (!stage) return fail(res, "MISSING_STAGE", 400);

    const { data, error } = await sb
      .from("leads")
      .update({ stage })
      .eq("id", leadId)
      .eq("workspace_id", workspace_id)
      .select("*")
      .maybeSingle();

    if (error) return fail(res, "LEAD_UPDATE_FAILED", 500, { details: error });
    if (!data) return fail(res, "LEAD_NOT_FOUND", 404);

    return ok(res, data);
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
