// api/leads.ts
import { setCors, ok, fail } from "./_lib/response.ts";
import { requireAuth } from "./_lib/auth.ts";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

const toStage = (status: any) => {
  const s = String(status || "Novo");
  // se já vier no padrão do UI, mantém
  return s;
};

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id; // workspace_id do header = client_id no seu schema

  if (req.method === "GET") {
    const { data, error } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });

    const mapped = (data ?? []).map((l: any) => ({
      ...l,
      workspace_id: l.client_id,      // compat com UI antiga (se ela espera)
      stage: toStage(l.status),       // compat com pipeline
      status: l.status ?? "Novo",
    }));

    return ok(res, mapped);
  }

  if (req.method === "POST") {
    let body: any = {};
    try { body = req.body || {}; } catch { body = {}; }

    const name = body?.name ?? null;
    const phone = body?.phone ?? null;
    const notes = body?.notes ?? null;

    // UI pode mandar stage; seu banco usa status
    const status = body?.status ?? body?.stage ?? "Novo";
    const tags = body?.tags ?? null;

    const { data, error } = await sb
      .from("leads")
      .insert({ client_id, name, phone, notes, status, tags })
      .select("*")
      .maybeSingle();

    if (error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: error });

    return ok(res, {
      ...data,
      workspace_id: data.client_id,
      stage: toStage(data.status),
    }, 201);
  }

  if (req.method === "PATCH") {
    const leadId = req.query?.id;
    if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

    let body: any = {};
    try { body = req.body || {}; } catch { body = {}; }

    // UI manda stage; grava em status
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

    return ok(res, {
      ...data,
      workspace_id: data.client_id,
      stage: toStage(data.status),
    });
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
