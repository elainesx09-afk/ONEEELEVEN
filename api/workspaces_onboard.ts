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

  return { workspace_id: String(workspaceId), token: String(token) };
}

export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const sb = supabaseAdmin();
    const wid = auth.workspace_id;

    const { data: ws, error } = await sb
      .from("workspaces")
      .select("*")
      .eq("id", wid)
      .maybeSingle();

    if (error) return fail(res, "WORKSPACE_FETCH_FAILED", 500, { details: error });

    // Retorna sempre array (UI workspace switcher gosta)
    if (!ws) {
      return ok(res, [{
        id: wid,
        name: "One Eleven",
        niche: "Workspace",
        timezone: "America/Sao_Paulo",
        status: "active",
        instances: 0,
        leads: 0,
        conversions: 0,
        lastActivity: "—",
        createdAt: new Date().toISOString(),
      }]);
    }

    return ok(res, [{
      id: String(ws.id),
      name: ws.name ?? "Workspace",
      niche: ws.niche ?? "Workspace",
      timezone: ws.timezone ?? "America/Sao_Paulo",
      status: ws.status ?? "active",
      instances: 0,
      leads: 0,
      conversions: 0,
      lastActivity: "—",
      createdAt: ws.created_at ?? new Date().toISOString(),
    }]);
  } catch (e: any) {
    return fail(res, "WORKSPACES_CRASH", 500, { details: String(e?.message || e) });
  }
}
