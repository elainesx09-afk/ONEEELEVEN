import { createClient } from "@supabase/supabase-js";

function cors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, workspace_id");
}
function fail(res: any, error: string, status = 400, extra?: any) {
  const debugId = `dbg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  return res.status(status).json({ ok: false, error, debugId, ...(extra || {}) });
}
function ok(res: any, data: any, status = 200) {
  return res.status(status).json({ ok: true, data });
}
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}
async function requireAuth(req: any, res: any) {
  const token = req.headers["x-api-token"];
  const workspaceId = req.headers["workspace_id"];
  if (!token) return fail(res, "MISSING_X_API_TOKEN", 401);
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 401);

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("api_tokens")
    .select("token, workspace_id, is_active")
    .eq("token", token)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return fail(res, "AUTH_QUERY_FAILED", 500, { details: error });
  if (!data) return fail(res, "INVALID_TOKEN_OR_WORKSPACE", 403);
  return { workspace_id: String(workspaceId) };
}

// DB status -> UI stage (pipeline)
function statusToStage(status: any): string {
  const s = String(status || "Novo").trim().toLowerCase();

  // PT-BR do banco
  if (s === "novo") return "novo";
  if (s === "qualificando" || s === "qualificado") return "qualificando";
  if (s === "proposta") return "proposta";
  if (s === "follow-up" || s === "follow up" || s === "followup") return "follow-up";
  if (s === "agendado") return "proposta"; // se seu pipeline não tem "agendado", mapeia pra proposta
  if (s === "fechado" || s === "ganhou") return "ganhou";
  if (s === "perdido") return "perdido";

  // Se já vier no formato do pipeline
  if (["novo","qualificando","proposta","follow-up","ganhou","perdido"].includes(s)) return s;

  return "novo";
}

// UI stage -> DB status (pra PATCH do pipeline)
function stageToStatus(stage: any): string {
  const s = String(stage || "novo").trim().toLowerCase();
  if (s === "novo") return "Novo";
  if (s === "qualificando") return "Qualificando";
  if (s === "proposta") return "Proposta";
  if (s === "follow-up" || s === "follow up" || s === "followup") return "Follow-up";
  if (s === "ganhou") return "Fechado";
  if (s === "perdido") return "Perdido";
  return "Novo";
}

export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = supabaseAdmin();
  const client_id = auth.workspace_id; // no seu schema, workspace_id = clients.id

  try {
    if (req.method === "GET") {
      const { data, error } = await sb
        .from("leads")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false });

      if (error) return fail(res, "LEADS_FETCH_FAILED", 500, { details: error });

      const mapped = (data ?? []).map((l: any) => ({
        ...l,
        workspace_id: l.client_id,
        stage: statusToStage(l.status), // <<< FIX pipeline
        status: l.status ?? "Novo",
      }));

      return ok(res, mapped);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = body?.name ?? null;
      const phone = body?.phone ?? null;

      const status = stageToStatus(body?.stage ?? body?.status ?? "novo");

      const { data, error } = await sb
        .from("leads")
        .insert({ client_id, name, phone, status })
        .select("*")
        .maybeSingle();

      if (error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: error });

      return ok(
        res,
        {
          ...data,
          workspace_id: data.client_id,
          stage: statusToStage(data.status),
          status: data.status ?? "Novo",
        },
        201
      );
    }

    if (req.method === "PATCH") {
      const leadId = req.query?.id;
      if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

      const body = req.body || {};
      const status = stageToStatus(body?.stage ?? body?.status);
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
        stage: statusToStage(data.status),
        status: data.status ?? "Novo",
      });
    }

    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (e: any) {
    return fail(res, "LEADS_CRASH", 500, { details: String(e?.message || e) });
  }
}
