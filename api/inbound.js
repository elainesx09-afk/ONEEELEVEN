// POST /api/inbound — n8n INBOUND_PIPELINE v2
// GET  /api/inbound — ping
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

const ALLOWED = new Set(["Novo","Em atendimento","Qualificado","Agendado","Fechado","Perdido"]);
const phone  = (v) => String(v || "").trim().replace(/\D+/g, "");
const status = (v) => { const s = String(v || "Novo").trim(); return ALLOWED.has(s) ? s : "Novo"; };

async function upsertMessage(sb, payload) {
  if (payload.external_id) {
    const { data: dup } = await sb.from("messages").select("id,lead_id")
      .eq("client_id", payload.client_id).eq("external_id", payload.external_id).maybeSingle();
    if (dup) return { data: dup, isDuplicate: true };
  }
  const { data, error } = await sb.from("messages").insert(payload).select("*").maybeSingle();
  if (!error) return { data, isDuplicate: false };
  // fallback colunas ausentes
  if (["PGRST204","42703"].includes(error?.code)) {
    const r = await sb.from("messages")
      .insert({ client_id: payload.client_id, lead_id: payload.lead_id, direction: payload.direction, body: payload.body })
      .select("*").maybeSingle();
    return { data: r.data, error: r.error, isDuplicate: false };
  }
  return { data: null, error, isDuplicate: false };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, data: { route: "/api/inbound", version: "2.0.0" } });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const cid = auth.workspace_id;
  const b   = req.body || {};

  const leadPhone = phone(b?.lead?.phone || b?.lead?.number || b?.lead?.whatsapp);
  const leadName  = b?.lead?.name ? String(b.lead.name) : null;
  const leadStatus = status(b?.lead?.status);
  const msgBody   = String(b?.message?.body ?? b?.message?.text ?? b?.body ?? b?.text ?? "");
  const direction = b?.message?.direction === "out" ? "out" : "in";
  const msgType   = b?.message?.type || "text";
  const extId     = b?.message?.external_id || null;
  const mediaUrl  = b?.message?.media_url || null;
  const instance  = b?.message?.instance || b?.instance || null;
  const ts        = b?.message?.timestamp || null;

  if (!leadPhone) return fail(res, "MISSING_LEAD_PHONE", 400);
  if (!msgBody)   return fail(res, "MISSING_MESSAGE_BODY", 400);

  // upsert lead
  const { data: found } = await sb.from("leads").select("id,instance")
    .eq("client_id", cid).eq("phone", leadPhone).maybeSingle();

  let lead_id = found?.id || null;

  if (!lead_id) {
    const { data: created, error: cErr } = await sb.from("leads")
      .insert({ client_id: cid, name: leadName, phone: leadPhone, status: leadStatus, instance, last_message_at: ts || new Date().toISOString() })
      .select("*").maybeSingle();
    if (cErr) {
      const { data: retry } = await sb.from("leads").select("id").eq("client_id", cid).eq("phone", leadPhone).maybeSingle();
      if (!retry) return fail(res, "LEAD_INSERT_FAILED", 500, { details: cErr });
      lead_id = retry.id;
    } else {
      lead_id = created?.id;
    }
  } else {
    await sb.from("leads").update({ last_message_at: ts || new Date().toISOString(), instance: instance || found.instance })
      .eq("id", lead_id).eq("client_id", cid);
  }

  if (!lead_id) return fail(res, "LEAD_ID_MISSING", 500);

  const msg = await upsertMessage(sb, {
    client_id: cid, lead_id, direction, body: msgBody,
    type: msgType, external_id: extId,
    status: direction === "out" ? "sent" : null,
    media_url: mediaUrl, instance, timestamp: ts,
  });

  if (msg.error) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msg.error });
  return ok(res, { client_id: cid, lead_id, message_id: msg.data?.id || null }, msg.isDuplicate ? 200 : 201);
}
