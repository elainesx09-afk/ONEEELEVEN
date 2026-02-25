// api/leads/stale.js
// ============================================================
// OBJETIVO: Buscar leads ociosos para o FOLLOWUP_AUTOMATION v2
// MÉTODO  : GET
// SEGURANÇA: requireAuth + client_id (multi-tenant inegociável)
// PARAMS  :
//   status        = "Novo,Em atendimento"  (CSV de status permitidos)
//   stale_minutes = 60                      (minutos sem atividade)
//   limit         = 30                      (max leads por run)
// ============================================================

import { setCors, ok, fail } from "../_lib/response.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

const ALLOWED_STATUSES = new Set([
  "Novo", "Em atendimento", "Qualificado", "Agendado"
]);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  // ---- Parse parâmetros ----
  const rawStatus      = String(req.query?.status || "Novo,Em atendimento");
  const staleMinutes   = Math.max(1, parseInt(req.query?.stale_minutes || "60", 10));
  const limit          = Math.min(100, Math.max(1, parseInt(req.query?.limit || "30", 10)));

  // Valida e filtra status permitidos (evita SQL injection por enum)
  const requestedStatuses = rawStatus
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ALLOWED_STATUSES.has(s));

  if (requestedStatuses.length === 0) {
    return fail(res, "INVALID_STATUS_FILTER", 400, {
      allowed: [...ALLOWED_STATUSES],
      received: rawStatus
    });
  }

  // ---- Calcula threshold de inatividade ----
  const thresholdDate = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

  // ---- Query: leads do workspace, com status correto, sem atividade recente ----
  // Leads "stale" = não tiveram followup OU o último followup foi > stale_minutes atrás
  const { data, error } = await sb
    .from("leads")
    .select("id, name, phone, status, instance, last_message_at, followup_sent_at, score")
    .eq("client_id", client_id)
    .in("status", requestedStatuses)
    .or(`last_message_at.lte.${thresholdDate},last_message_at.is.null`)
    // Não enviou followup ainda, OU o último followup foi antes do threshold
    .or(`followup_sent_at.is.null,followup_sent_at.lte.${thresholdDate}`)
    .not("phone", "is", null)
    .not("instance", "is", null)
    .order("last_message_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) return fail(res, "STALE_LEADS_FETCH_FAILED", 500, { details: error });

  const leads = data ?? [];

  console.log(JSON.stringify({
    level: "INFO",
    route: "/api/leads/stale",
    workspace_id: client_id,
    stale_minutes: staleMinutes,
    statuses: requestedStatuses,
    threshold: thresholdDate,
    found: leads.length,
  }));

  return ok(res, {
    data: leads.map((l) => ({ ...l, workspace_id: client_id })),
    count: leads.length,
    stale_minutes: staleMinutes,
    threshold: thresholdDate,
  });
}
