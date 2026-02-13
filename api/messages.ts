// api/messages.ts
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
    const lead_id = req.query?.lead_id;
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);

    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: true });

    if (error) return fail(res, "MESSAGES_FETCH_FAILED", 500, { details: error });
    return ok(res, data ?? []);
  }

  if (req.method === "POST") {
    let body: any = {};
    try { body = req.body || {}; } catch { body = {}; }

    const lead_id = body?.lead_id;
    const text = body?.body;

    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);
    if (!text || typeof text !== "string") return fail(res, "MISSING_BODY", 400);

    const { data, error } = await sb
      .from("messages")
      .insert({
        workspace_id,
        lead_id,
        direction: "out",
        body: text,
      })
      .select("*")
      .maybeSingle();

    if (error) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: error });
    return ok(res, data);
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
