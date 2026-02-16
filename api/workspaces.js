// api/workspaces.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-token, workspace_id"
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const token = req.headers["x-api-token"];
    if (!token) return res.status(401).json({ ok: false, error: "MISSING_X_API_TOKEN" });

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({
        ok: false,
        error: "MISSING_SUPABASE_ENVS",
        envs_present: { SUPABASE_URL: !!url, SUPABASE_SERVICE_ROLE_KEY: !!serviceKey }
      });
    }

    // importa supabase sem path relativo (evita o inferno do _lib)
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1) token -> workspaces autorizados
    const { data: toks, error: tokErr } = await sb
      .from("api_tokens")
      .select("workspace_id, is_active")
      .eq("token", token)
      .eq("is_active", true);

    if (tokErr) {
      return res.status(500).json({ ok: false, error: "TOKENS_QUERY_FAILED", details: tokErr });
    }

    const workspaceIds = (toks || []).map(t => t.workspace_id).filter(Boolean);
    if (workspaceIds.length === 0) return res.status(200).json({ ok: true, data: [] });

    // 2) busca workspaces
    const { data: wss, error: wsErr } = await sb
      .from("workspaces")
      .select("id, name, created_at")
      .in("id", workspaceIds)
      .order("created_at", { ascending: true });

    if (wsErr) {
      return res.status(500).json({ ok: false, error: "WORKSPACES_QUERY_FAILED", details: wsErr });
    }

    // 3) formato compatível com seu WorkspaceContext
    const mapped = (wss || []).map(w => ({
      id: w.id,
      name: w.name || "Workspace",
      niche: "Workspace",
      timezone: "America/Sao_Paulo",
      status: "active",
      instances: 0,
      leads: 0,
      conversions: 0,
      lastActivity: "—",
      createdAt: w.created_at || new Date().toISOString(),
    }));

    return res.status(200).json({ ok: true, data: mapped });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "WORKSPACES_CRASH",
      details: String(e?.message || e),
      stack: String(e?.stack || "")
    });
  }
}
