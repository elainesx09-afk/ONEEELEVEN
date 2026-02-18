// api/inbound.js
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

async function getColumns(sb, table) {
  // PostgREST schema cache: podemos inferir com 1 select vazio
  // Se der PGRST204 em coluna, tratamos no lugar certo.
  // Aqui deixamos simples: retorna null e fazemos fallback por tentativa.
  return null;
}

async function insertMessage(sb, payload) {
  // tenta body, se schema não tiver, tenta text
  const { data, error } = await sb.from("messages").insert(payload).select("*").maybeSingle();
  if (!error) return { data, error: null };

  // se body não existe (PGRST204), tenta trocar para text
  if (error?.code === "PGRST204" && String(error?.message || "").includes("'body'")) {
    const clone = { ...payload };
    clone.text = clone.body;
    delete clone.body;
    const retry = await sb.from("messages").insert(clone).select("*").maybeSingle();
    return { data: retry.data, error: retry.error || null };
  }

  return { data: null, error };
}

async function findLeadByPhone(sb, client_id, phone, phoneCol) {
  const { data, error } = await sb
    .from("leads")
    .select("id, name")
    .eq("client_id", client_id)
    .eq(phoneCol, phone)
    .maybeSingle();
  return { data, error };
}

async function createLead(sb, payload, phoneCol) {
  // payload contém phone em payload.phone sempre
  // mas a coluna real pode ser number/whatsapp
  const row = { ...payload };
  if (phoneCol !== "phone") {
    row[phoneCol] = row.phone;
    delete row.phone;
  }

  const { data, error } = await sb.from("leads").insert(row).select("*").maybeSingle();
  return { data, error };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  // GET só debug (não é inbound real)
  if (req.method === "GET") {
    return ok(res, {
      route: "/api/inbound",
      note: "Use POST para inbound real",
      envs_present: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
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
  try { body = req.body || {}; } catch { body = {}; }

  const phone = normalizePhone(body?.lead?.phone || body?.lead?.number || body?.lead?.whatsapp);
  const name = body?.lead?.name ? String(body.lead.name) : null;
  const status = safeStatus(body?.lead?.status || body?.lead?.stage || "Novo");

  const msgBody =
    (body?.message?.body ?? body?.message?.text ?? body?.body ?? body?.text) != null
      ? String(body?.message?.body ?? body?.message?.text ?? body?.body ?? body?.text)
      : null;

  const direction = body?.message?.direction === "out" ? "out" : "in";

  if (!phone) return fail(res, "MISSING_LEAD_PHONE", 400);
  if (!msgBody) return fail(res, "MISSING_MESSAGE_BODY", 400);

  // 1) Descobre qual coluna de telefone existe na tabela leads
  // Tentamos na ordem mais comum: phone -> number -> whatsapp
  const phoneCols = ["phone", "number", "whatsapp"];
  let phoneCol = "phone";

  // tenta lookup com "phone"; se der PGRST204, troca coluna
  let existing = null;

  for (const col of phoneCols) {
    const r = await findLeadByPhone(sb, client_id, phone, col);
    if (!r.error) {
      phoneCol = col;
      existing = r.data || null;
      break;
    }
    // se a coluna não existe, tenta próxima
    if (r.error?.code === "PGRST204" && String(r.error?.message || "").includes(`'${col}'`)) {
      continue;
    }
    // erro real
    return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: r.error });
  }

  let lead_id = existing?.id || null;

  // 2) Se não existe, cria lead (com fallback contra corrida)
  if (!lead_id) {
    const payload = { client_id, name, phone, status };

    const created = await createLead(sb, payload, phoneCol);

    if (created.error) {
      // se falhou por possível corrida/unique, tenta achar de novo
      const again = await findLeadByPhone(sb, client_id, phone, phoneCol);
      if (again.error) return fail(res, "LEAD_INSERT_FAILED", 500, { details: created.error });
      lead_id = again.data?.id || null;
    } else {
      lead_id = created.data?.id || null;
    }
  }

  if (!lead_id) return fail(res, "LEAD_ID_MISSING_AFTER_UPSERT", 500);

  // 3) Insere mensagem (body ou text)
  const msgInsert = await insertMessage(sb, { client_id, lead_id, direction, body: msgBody });
  if (msgInsert.error) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msgInsert.error });

  return ok(res, { client_id, lead_id, message_id: msgInsert.data?.id || null }, 201);
}
