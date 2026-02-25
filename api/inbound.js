// api/inbound.js
// ============================================================
// OBJETIVO: Receber mensagens do n8n INBOUND_PIPELINE v2
// FLUXO: Evolution → n8n → SaaS (este endpoint)
// ============================================================
// MUDANÇAS v2:
// - Aceita external_id (idempotência)
// - Aceita type, media_url, instance
// - Aceita timestamp customizado
// - Response no formato esperado pelo n8n
// ============================================================

import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

function normalizePhone(v) {
  return String(v || "").trim().replace(/\D+/g, "");
}

const ALLOWED_STATUS = new Set([
  "Novo",
  "Em atendimento",
  "Qualificado",
  "Agendado",
  "Fechado",
  "Perdido",
]);

function safeStatus(v) {
  const s = String(v || "Novo").trim();
  return ALLOWED_STATUS.has(s) ? s : "Novo";
}

async function findLeadByPhone(sb, client_id, phone, phoneCol) {
  const { data, error } = await sb
    .from("leads")
    .select("id, name, instance")
    .eq("client_id", client_id)
    .eq(phoneCol, phone)
    .maybeSingle();
  return { data, error };
}

async function createLead(sb, payload, phoneCol) {
  const row = { ...payload };
  if (phoneCol !== "phone") {
    row[phoneCol] = row.phone;
    delete row.phone;
  }

  const { data, error } = await sb
    .from("leads")
    .insert(row)
    .select("*")
    .maybeSingle();
  return { data, error };
}

// ============================================================
// FUNÇÃO PRINCIPAL: Verifica idempotência + insere mensagem
// ============================================================
async function insertMessageWithIdempotency(sb, payload) {
  const { external_id, client_id } = payload;

  // 1) Se tem external_id, verifica se já existe (IDEMPOTÊNCIA)
  if (external_id) {
    const { data: existing, error: checkErr } = await sb
      .from("messages")
      .select("id, lead_id")
      .eq("client_id", client_id)
      .eq("external_id", external_id)
      .maybeSingle();

    if (existing) {
      console.log(`[INBOUND] Mensagem duplicada ignorada: ${external_id}`);
      return { data: existing, error: null, isDuplicate: true };
    }

    if (checkErr && checkErr.code !== "PGRST116") {
      // PGRST116 = not found, ok continuar
      console.error("[INBOUND] Erro ao checar duplicação:", checkErr);
    }
  }

  // 2) Tenta inserir com TODOS os campos
  const { data, error } = await sb
    .from("messages")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (!error) return { data, error: null, isDuplicate: false };

  // 3) FALLBACK: Se coluna não existe (PGRST204), remove campos extras
  if (error?.code === "PGRST204") {
    console.warn("[INBOUND] Colunas extras não existem, usando fallback...");
    const fallbackPayload = {
      client_id: payload.client_id,
      lead_id: payload.lead_id,
      direction: payload.direction,
      body: payload.body,
    };

    const retry = await sb
      .from("messages")
      .insert(fallbackPayload)
      .select("*")
      .maybeSingle();

    return { data: retry.data, error: retry.error, isDuplicate: false };
  }

  return { data: null, error, isDuplicate: false };
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return ok(res, {
      route: "/api/inbound",
      note: "Use POST para inbound real (n8n INBOUND_PIPELINE v2)",
      version: "2.0.0",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  let body = {};
  try {
    body = req.body || {};
  } catch {
    body = {};
  }

  // ============================================================
  // PARSING DO PAYLOAD n8n v2
  // ============================================================
  const phone = normalizePhone(
    body?.lead?.phone || body?.lead?.number || body?.lead?.whatsapp
  );
  const name = body?.lead?.name ? String(body.lead.name) : null;
  const status = safeStatus(body?.lead?.status || body?.lead?.stage || "Novo");

  const msgBody =
    (body?.message?.body ?? body?.message?.text ?? body?.body ?? body?.text) !=
    null
      ? String(
          body?.message?.body ?? body?.message?.text ?? body?.body ?? body?.text
        )
      : null;

  const direction = body?.message?.direction === "out" ? "out" : "in";
  const msgType = body?.message?.type || "text";
  const externalId = body?.message?.external_id || null;
  const mediaUrl = body?.message?.media_url || null;
  const instance = body?.message?.instance || body?.instance || null;
  const customTimestamp = body?.message?.timestamp || null;

  if (!phone) return fail(res, "MISSING_LEAD_PHONE", 400);
  if (!msgBody) return fail(res, "MISSING_MESSAGE_BODY", 400);

  // ============================================================
  // 1) DESCOBRE COLUNA DE TELEFONE (compatibilidade)
  // ============================================================
  const phoneCols = ["phone", "number", "whatsapp"];
  let phoneCol = "phone";
  let existing = null;

  for (const col of phoneCols) {
    const r = await findLeadByPhone(sb, client_id, phone, col);
    if (!r.error) {
      phoneCol = col;
      existing = r.data || null;
      break;
    }
    if (
      r.error?.code === "PGRST204" &&
      String(r.error?.message || "").includes(`'${col}'`)
    ) {
      continue;
    }
    return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: r.error });
  }

  let lead_id = existing?.id || null;

  // ============================================================
  // 2) CRIA LEAD SE NÃO EXISTE
  // ============================================================
  if (!lead_id) {
    const payload = {
      client_id,
      name,
      phone,
      status,
      instance, // Salva instance no lead
      last_message_at: customTimestamp || new Date().toISOString(),
    };

    const created = await createLead(sb, payload, phoneCol);

    if (created.error) {
      // Possível race condition, tenta buscar novamente
      const again = await findLeadByPhone(sb, client_id, phone, phoneCol);
      if (again.error)
        return fail(res, "LEAD_INSERT_FAILED", 500, { details: created.error });
      lead_id = again.data?.id || null;
    } else {
      lead_id = created.data?.id || null;
    }
  } else {
    // Atualiza last_message_at do lead existente
    await sb
      .from("leads")
      .update({ 
        last_message_at: customTimestamp || new Date().toISOString(),
        instance: instance || existing.instance // Preserva instance se já existe
      })
      .eq("id", lead_id)
      .eq("client_id", client_id);
  }

  if (!lead_id) return fail(res, "LEAD_ID_MISSING_AFTER_UPSERT", 500);

  // ============================================================
  // 3) INSERE MENSAGEM COM IDEMPOTÊNCIA
  // ============================================================
  const msgPayload = {
    client_id,
    lead_id,
    direction,
    body: msgBody,
    type: msgType,
    external_id: externalId,
    status: direction === "out" ? "sent" : null,
    media_url: mediaUrl,
    instance,
    timestamp: customTimestamp,
    created_at: customTimestamp || undefined, // Usa customTimestamp se fornecido
  };

  const msgInsert = await insertMessageWithIdempotency(sb, msgPayload);

  if (msgInsert.error) {
    return fail(res, "MESSAGE_INSERT_FAILED", 500, {
      details: msgInsert.error,
    });
  }

  // ============================================================
  // 4) RESPONSE NO FORMATO n8n v2 ESPERA
  // ============================================================
  return ok(
    res,
    {
      client_id,
      lead_id,
      message_id: msgInsert.data?.id || null,
    },
    msgInsert.isDuplicate ? 200 : 201
  );
}
