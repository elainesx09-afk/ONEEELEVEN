// GET   /api/messages?lead_id=:id  → histórico
// POST  /api/messages              → registra mensagem enviada (OUTBOX)
// PATCH /api/messages?route=status → atualiza status (via rewrite de /api/messages/status)
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
  const route = req.query?.route;

  // ── PATCH /api/messages/status ────────────────────────────
  if (req.method === "PATCH" && route === "status") {
    const b = req.body || {};
    const external_id = b?.external_id;
    const status      = b?.status || "read";
    const read_at     = b?.read_at || new Date().toISOString();

    if (!external_id) return fail(res, "MISSING_EXTERNAL_ID", 400);
    if (!["read","delivered","failed","sent"].includes(status)) return fail(res, "INVALID_STATUS", 400);

    const { data: found } = await sb.from("messages").select("id")
      .eq("client_id", cid).eq("external_id", external_id).maybeSingle();
    if (!found) return ok(res, { updated: false, reason: "message_not_found" });

    let { data, error } = await sb.from("messages").update({ status, read_at })
      .eq("id", found.id).eq("client_id", cid).select("id,status,read_at").maybeSingle();

    if (["PGRST204","42703"].includes(error?.code)) {
      const r = await sb.from("messages").update({ status })
        .eq("id", found.id).eq("client_id", cid).select("id,status").maybeSingle();
      data = r.data; error = r.error;
    }
    if (error) return fail(res, "STATUS_UPDATE_FAILED", 500, { details: error });
    return ok(res, { updated: true, message_id: data?.id, external_id, status, read_at: data?.read_at || read_at });
  }

  // ── GET /api/messages?lead_id=:id ─────────────────────────
  if (req.method === "GET") {
    const lead_id = req.query?.lead_id;
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);
    const { data, error } = await sb.from("messages").select("*")
      .eq("client_id", cid).eq("lead_id", lead_id).order("created_at", { ascending: true });
    if (error) return fail(res, "MESSAGES_FETCH_FAILED", 500, { details: error });
    return ok(res, data ?? []);
  }

  // ── POST /api/messages ────────────────────────────────────
  if (req.method === "POST") {
    const b = req.body || {};
    if (!b?.lead_id) return fail(res, "MISSING_LEAD_ID", 400);
    if (!b?.body && !b?.media_url) return fail(res, "MISSING_BODY", 400);

    const payload = {
      client_id: cid, lead_id: b.lead_id,
      direction: b?.direction || "out",
      body: b?.body || `[${b?.type || "media"}]`,
      type: b?.type || "text",
      external_id: b?.external_id || null,
      status: "sent",
      media_url: b?.media_url || null,
      instance: b?.instance || null,
    };

    const { data, error } = await sb.from("messages").insert(payload).select("*").maybeSingle();
    if (["PGRST204","42703"].includes(error?.code)) {
      const r = await sb.from("messages")
        .insert({ client_id: cid, lead_id: payload.lead_id, direction: payload.direction, body: payload.body })
        .select("*").maybeSingle();
      if (r.error) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: r.error });
      return ok(res, r.data, 201);
    }
    if (error) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: error });
    return ok(res, data, 201);
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
