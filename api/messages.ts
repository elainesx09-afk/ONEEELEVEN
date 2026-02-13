// api/messages.ts
import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

// Evita vazar campos futuros
const MESSAGES_SELECT =
  "id, client_id, lead_id, direction, body, created_at";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  if (req.method === "GET") {
    const lead_id = req.query?.lead_id;
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);

    // ✅ garante que o lead pertence ao tenant (evita enumerar lead_id)
    const { data: lead, error: leadErr } = await sb
      .from("leads")
      .select("id, client_id")
      .eq("id", lead_id)
      .eq("client_id", client_id)
      .maybeSingle();

    if (leadErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: leadErr });
    if (!lead) return fail(res, "LEAD_NOT_FOUND", 404);

    const { data, error } = await sb
      .from("messages")
      .select(MESSAGES_SELECT)
      .eq("client_id", client_id)
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

    const trimmed = text.trim();
    if (!trimmed) return fail(res, "MISSING_BODY", 400);

    // ✅ garante que o lead pertence ao tenant
    const { data: lead, error: leadErr } = await sb
      .from("leads")
      .select("id, client_id")
      .eq("id", lead_id)
      .eq("client_id", client_id)
      .maybeSingle();

    if (leadErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: leadErr });
    if (!lead) return fail(res, "LEAD_NOT_FOUND", 404);

    const { data, error } = await sb
      .from("messages")
      .insert({ client_id, lead_id, direction: "out", body: trimmed })
      .select(MESSAGES_SELECT)
      .maybeSingle();

    if (error) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: error });

    // ✅ opcional: atualiza "last_message" no lead (se existir no schema)
    // Se essas colunas não existirem, o update falha — então fazemos best-effort com try/catch.
    try {
      await sb
        .from("leads")
        .update({ last_message: trimmed, last_message_at: new Date().toISOString() })
        .eq("id", lead_id)
        .eq("client_id", client_id);
    } catch {
      // ignora — não é crítico pro envio
    }

    return ok(res, data, 201);
  }

  return fail(res, "METHOD_NOT_ALLOWED", 405);
}
