export function applyTenantFromUrl() {
  if (typeof window === "undefined") return;
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const workspace = params.get("workspace");
if (token) localStorage.setItem("one11_api_token", token);
if (workspace) localStorage.setItem("one11_workspace_id", workspace);

if (token || workspace) {
const newUrl = window.location.pathname;
window.history.replaceState({}, document.title, newUrl);
}
}

export function getTenantConfig() {
if (typeof window === "undefined") return { token: null, workspaceId: null };
return {
token: localStorage.getItem("one11_api_token"),
workspaceId: localStorage.getItem("one11_workspace_id"),
};
}


**2. Arquivo: `api/inbound.js`**
JavaScript
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
export default async function handler(req, res) {
setCors(res);
if (req.method === "OPTIONS") return res.status(204).end();
if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

const auth = await requireAuth(req, res);
if (!auth) return;

const sb = await supabaseAdmin();
const client_id = auth.workspace_id;
const body = req.body || {};

const phone = String(body?.lead?.phone || body?.lead?.number || body?.lead?.whatsapp || "").replace(/\D+/g, "");
const msgBody = String(body?.message?.body ?? body?.message?.text ?? body?.body ?? body?.text ?? "");
const externalId = body?.message?.external_id || null;

if (!phone || !msgBody) return fail(res, "MISSING_REQUIRED_FIELDS", 400);

// Idempotência
if (externalId) {
const { data: existingMsg } = await sb.from("messages").select("id").eq("client_id", client_id).eq("external_id", externalId).maybeSingle();
if (existingMsg) return ok(res, { client_id, message_id: existingMsg.id }, 200);
}

// Busca ou cria Lead
let { data: lead } = await sb.from("leads").select("id").eq("client_id", client_id).eq("phone", phone).maybeSingle();

if (!lead) {
const { data: newLead, error: leadErr } = await sb.from("leads").insert({
client_id, phone, name: body?.lead?.name || null, status: "Novo", last_message_at: new Date().toISOString()
}).select("id").maybeSingle();
if (leadErr) return fail(res, "LEAD_INSERT_FAILED", 500, { details: leadErr });
lead = newLead;
} else {
await sb.from("leads").update({ last_message_at: new Date().toISOString() }).eq("id", lead.id);
}

// Insere Mensagem
const { data: msg, error: msgErr } = await sb.from("messages").insert({
client_id, lead_id: lead.id, direction: "in", body: msgBody, external_id: externalId, type: body?.message?.type || "text"
}).select("id").maybeSingle();

if (msgErr) return fail(res, "MESSAGE_INSERT_FAILED", 500, { details: msgErr });

return ok(res, { client_id, lead_id: lead.id, message_id: msg.id }, 201);
}


**3. Arquivo: `api/messages.js`**
JavaScript
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
export default async function handler(req, res) {
setCors(res);
if (req.method === "OPTIONS") return res.status(204).end();

const auth = await requireAuth(req, res);
if (!auth) return;
const sb = await supabaseAdmin();
const client_id = auth.workspace_id;

if (req.method === "GET") {
const { lead_id } = req.query;
if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);
const { data, error } = await sb.from("messages").select("*").eq("client_id", client_id).eq("lead_id", lead_id).order("created_at", { ascending: true });
if (error) return fail(res, "FETCH_FAILED", 500, { details: error });
return ok(res, data || []);
}

if (req.method === "POST") {
const body = req.body || {};
if (!body.lead_id || !body.body) return fail(res, "MISSING_FIELDS", 400);

const { data, error } = await sb.from("messages").insert({
  client_id, lead_id: body.lead_id, direction: "out", body: body.body, status: "sent", external_id: body.external_id || null
}).select("*").maybeSingle();
if (error) return fail(res, "INSERT_FAILED", 500, { details: error });
return ok(res, data, 201);
}

if (req.method === "PATCH") {
const { external_id, status } = req.body || {};
if (!external_id || !status) return fail(res, "MISSING_FIELDS", 400);

const { data, error } = await sb.from("messages").update({ status, updated_at: new Date().toISOString() })
  .eq("client_id", client_id).eq("external_id", external_id).select("*").maybeSingle();
  
if (error) return fail(res, "UPDATE_FAILED", 500, { details: error });
return ok(res, { updated: true, data });
}

return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}


**4. Arquivo: `api/instances.js`**
JavaScript
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
export default async function handler(req, res) {
setCors(res);
if (req.method === "OPTIONS") return res.status(204).end();

const auth = await requireAuth(req, res);
if (!auth) return;
const sb = await supabaseAdmin();
const client_id = auth.workspace_id;

if (req.method === "GET") {
const { data, error } = await sb.from("instances").select("*").eq("client_id", client_id).order("created_at", { ascending: false });
if (error) return fail(res, "FETCH_FAILED", 500, { details: error });
return ok(res, data || []);
}

if (req.method === "POST") {
const { instance_name, status = "qrcode", qr_base64 = null } = req.body || {};
if (!instance_name) return fail(res, "MISSING_NAME", 400);

const payload = { client_id, instance_name, status, qr_base64, updated_at: new Date().toISOString() };
// Verifica se existe para fazer UPSERT seguro
const { data: existing } = await sb.from("instances").select("id").eq("client_id", client_id).eq("instance_name", instance_name).maybeSingle();

if (existing) {
const { data } = await sb.from("instances").update(payload).eq("id", existing.id).select("").maybeSingle();
return ok(res, data, 200);
} else {
const { data } = await sb.from("instances").insert(payload).select("").maybeSingle();
return ok(res, data, 201);
}


}
return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
