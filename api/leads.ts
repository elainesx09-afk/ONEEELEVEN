import { setCors, ok, fail } from "./lib/response.js";
import { requireAuth } from "./lib/auth.js";
import { supabaseAdmin } from "./lib/supabaseAdmin.js";

const toStage = (status: any) => String(status || "Novo");

export default async function handler(req: any, res: any) {
  try {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();

    const auth = await requireAuth(req, res);
    if (!auth) return;

    const sb = await supabaseAdmin();
    const client_id = auth.workspace_id; // workspace_id header = client_id (seu schema atual)

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("leads")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false });

      if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });

      return ok(
        res,
        (data ?? []).map((l: any) => ({
          ...l,
          workspace_id: l.client_id,
          stage: toStage(l.status),
          status: l.status ?? "Novo",
        }))
      );
    }

    if (req.method === "POST") {
      let body: any = {};
      try { body = req.body || {}; } catch { body = {}; }

      const name = body?.name ?? null;
      const phone = body?.phone ?? null;
      const notes = body?.notes ?? null;
      const status = body?.status ?? body?.stage ?? "Novo";
      const tags = body?.tags ?? null;

      const { data, error } = await sb
        .from("leads")
        .insert({ client_id, name, phone, notes, status, tags })
        .select("*")
        .maybeSingle();

      if (error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: error });

      return ok(res, { ...data, workspace_id: data.client_id, stage: toStage(data.status) }, 201);
    }

    if (req.method === "PATCH") {
      const leadId = req.query?.id;
      if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

      let body: any = {};
      try { body = req.body || {}; } catch { body = {}; }

      const status = body?.status ?? body?.stage;
      if (!status) return fail(res, "MISSING_STAGE", 400);

      const { data, error } = await sb
        .from("leads")
        .update({ status })
        .eq("id", leadId)
        .eq("client_id", client_id)
        .select("*")
        .maybeSingle();

      if (error) return fail(res, "LEAD_UPDATE_FAILED", 500, { details: error });
      if (!data) return fail(res, "LEAD_NOT_FOUND", 404);

      return ok(res, { ...data, workspace_id: data.client_id, stage: toStage(data.status) });
    }

    return fail(res, "METHOD_NOT_ALLOWED", 405);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "LEADS_HANDLER_CRASH", details: String(e?.message || e) });
  }
}
