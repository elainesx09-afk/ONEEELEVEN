import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

/**
 * MVP inbound (base para Evolution/n8n):
 * - Method: POST
 * - Headers: x-api-token + workspace_id (mesmo padrão do SaaS)
 * - Body aceito (simples):
 *   {
 *     "lead": { "name": "Fulano", "phone": "5511999999999" },
 *     "message": { "body": "texto", "direction": "in" | "out" }
 *   }
 *
 * Resultado:
 * - upsert lead por (client_id + phone)
 * - insere message vinculada ao lead
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const sb = await supabaseAdmin();
    const client_id = auth.workspace_id;

    const body = req.body || {};
    const lead = body.lead || {};
    const msg = body.message || {};

    const phone = lead.phone ? String(lead.phone) : null;
    const name = lead.name ? String(lead.name) : null;

    if (!phone) return fail(res, "MISSING_LEAD_PHONE", 400);
    const direction = (msg.direction === "out" ? "out" : "in");
    const text = msg.body ? String(msg.body) : "";
    if (!text) return fail(res, "MISSING_MESSAGE_BODY", 400);

    // 1) find lead by phone
    const { data: existing, error: findErr } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .eq("phone", phone)
      .maybeSingle();

    if (findErr && findErr.code !== "PGRST116") {
      return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: findErr });
    }

    let leadRow = existing;

    if (!leadRow) {
      // create lead with default status compatible com check constraint
      const { data: inserted, error: insErr } = await sb
        .from("leads")
        .insert({ client_id, name, phone, status: "Novo" })
        .select("*")
        .maybeSingle();

      if (insErr) return fail(res, "LEAD_INSERT_FAILED", 500, { details: insErr });
      leadRow = inserted;
    } else if (name && !leadRow.name) {
      // optional: enrich name if missing
      await sb.from("leads").update({ name }).eq("id", leadRow.id).eq("client_id", client_id);
    }

    // 2) insert message
    const { data: m, error: msgErr } = await sb
      .from("messages")
      .insert({ client_id, lead_id: leadRow.id, direction, body: text })
      .select("*")
      .maybeSingle();

    if (msgErr) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msgErr });

    return ok(res, { lead: leadRow, message: m }, 201);
  } catch (e) {
    return fail(res, "INBOUND_CRASH", 500, { details: String(e?.message || e) });
  }
}
