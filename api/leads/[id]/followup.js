// api/leads/[id]/followup.js
// ============================================================
// OBJETIVO: Marcar followup como enviado para um lead específico
// MÉTODO  : PATCH
// SEGURANÇA: requireAuth + .eq("client_id") — multi-tenant blindado
// CHAMADO POR: FOLLOWUP_AUTOMATION v2 após enviar mensagem
// BODY: { followup_sent_at: ISO, followup_text: string }
// ============================================================

import { setCors, ok, fail } from "../../_lib/response.js";
import { requireAuth } from "../../_lib/auth.js";
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "PATCH") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  // O ID vem tanto de req.query.id (Vercel dynamic route) quanto de req.query diretamente
  const leadId = req.query?.id;
  if (!leadId) return fail(res, "MISSING_LEAD_ID", 400);

  let body = {};
  try { body = req.body || {}; } catch { body = {}; }

  const followup_sent_at = body?.followup_sent_at || new Date().toISOString();
  const followup_text    = body?.followup_text
    ? String(body.followup_text).substring(0, 2000)
    : null;

  // ---- Valida que o lead pertence ao workspace (multi-tenant guard) ----
  const { data: lead, error: lookupErr } = await sb
    .from("leads")
    .select("id, client_id, status, followup_sent_at")
    .eq("id", leadId)
    .eq("client_id", client_id)
    .maybeSingle();

  if (lookupErr) return fail(res, "LEAD_LOOKUP_FAILED", 500, { details: lookupErr });
  if (!lead)     return fail(res, "LEAD_NOT_FOUND_OR_UNAUTHORIZED", 404);

  // ---- Atualiza followup ----
  const updates = {
    followup_sent_at,
    updated_at: new Date().toISOString(),
  };
  if (followup_text !== null) updates.followup_text = followup_text;

  const { data, error } = await sb
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .eq("client_id", client_id)
    .select("id, status, followup_sent_at, followup_text, updated_at")
    .maybeSingle();

  if (error) return fail(res, "FOLLOWUP_UPDATE_FAILED", 500, { details: error });
  if (!data) return fail(res, "LEAD_UPDATE_RETURNED_EMPTY", 500);

  console.log(JSON.stringify({
    level: "INFO",
    route: "/api/leads/[id]/followup",
    workspace_id: client_id,
    lead_id: leadId,
    followup_sent_at,
    event: "followup_marked",
  }));

  return ok(res, { ...data, workspace_id: client_id });
}
