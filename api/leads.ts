// api/leads.ts
export default async function handler(req: any, res: any) {
  // CORS (sem depender de _lib)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, workspace_id");

  if (req.method === "OPTIONS") return res.status(204).end();

  const fail = (error: string, status = 400, extra?: any) =>
    res.status(status).json({
      ok: false,
      error,
      debugId: `dbg_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      ...(extra || {}),
    });

  const ok = (data: any, status = 200) => res.status(status).json({ ok: true, data });

  const token = (req.headers["x-api-token"] || "").toString().trim();
  const workspace_id = (req.headers["workspace_id"] || "").toString().trim();

  if (!token) return fail("MISSING_X_API_TOKEN", 401);
  if (!workspace_id) return fail("MISSING_WORKSPACE_ID", 401);

  try {
    // ✅ dynamic import (se quebrar, agora volta JSON com details)
    const { supabaseAdmin } = await import("./_lib/supabaseAdmin.ts");

    const sb = await supabaseAdmin();

    // auth direto aqui (não importa auth.ts pra não crashar)
    const { data: tokRow, error: tokErr } = await sb
      .from("api_tokens")
      .select("token, workspace_id, is_active")
      .eq("token", token)
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    if (tokErr) return fail("AUTH_QUERY_FAILED", 500, { details: tokErr });
    if (!tokRow) return fail("INVALID_TOKEN_OR_WORKSPACE", 403);

    const client_id = workspace_id;

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("leads")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false });

      if (error) return fail("LEADS_FETCH_FAILED", 500, { details: error });

      const mapped = (data ?? []).map((l: any) => ({
        ...l,
        workspace_id: l.client_id,
        stage: String(l.status || "Novo"),
        status: l.status ?? "Novo",
      }));

      return ok(mapped);
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

      if (error) return fail("LEAD_INSERT_FAILED", 500, { details: error });

      return ok(
        { ...data, workspace_id: data.client_id, stage: String(data.status || "Novo") },
        201
      );
    }

    if (req.method === "PATCH") {
      const leadId = req.query?.id;
      if (!leadId) return fail("MISSING_LEAD_ID", 400);

      let body: any = {};
      try { body = req.body || {}; } catch { body = {}; }

      const status = body?.status ?? body?.stage;
      if (!status) return fail("MISSING_STAGE", 400);

      const { data, error } = await sb
        .from("leads")
        .update({ status })
        .eq("id", leadId)
        .eq("client_id", client_id)
        .select("*")
        .maybeSingle();

      if (error) return fail("LEAD_UPDATE_FAILED", 500, { details: error });
      if (!data) return fail("LEAD_NOT_FOUND", 404);

      return ok({ ...data, workspace_id: data.client_id, stage: String(data.status || "Novo") });
    }

    return fail("METHOD_NOT_ALLOWED", 405);
  } catch (e: any) {
    // ✅ agora qualquer crash vira JSON com stack
    return res.status(500).json({
      ok: false,
      error: "LEADS_CRASH_BEFORE_RESPONSE",
      details: String(e?.message || e),
      stack: e?.stack ? String(e.stack).slice(0, 1200) : null,
    });
  }
}
