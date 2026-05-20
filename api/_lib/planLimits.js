// Helper de limites de plano — verifica se um workspace pode usar um recurso.
// Usa as funções RPC check_workspace_limit / get_workspace_usage (migration 0051).

import { supabaseAdmin } from "./supabaseAdmin.js";

/**
 * Verifica se o workspace está dentro do limite para um recurso.
 * @param {string} workspaceId
 * @param {"leads"|"instances"|"users"|"kb_items"} resource
 * @returns {Promise<{allowed, resource, current, limit, plan_id, plan_name, is_trial, reason}>}
 */
export async function checkLimit(workspaceId, resource) {
  if (!workspaceId) {
    return { allowed: false, reason: "MISSING_WORKSPACE_ID" };
  }
  try {
    const sb = await supabaseAdmin();
    const { data, error } = await sb.rpc("check_workspace_limit", {
      p_workspace_id: workspaceId,
      p_resource: resource,
    });
    if (error) {
      // Fail-OPEN: se a checagem falhar, não bloqueia o fluxo (não punir cliente por bug nosso)
      console.warn("checkLimit RPC error:", error.message);
      return { allowed: true, reason: "CHECK_FAILED_FAIL_OPEN", resource };
    }
    return data;
  } catch (e) {
    console.warn("checkLimit exception:", e.message);
    return { allowed: true, reason: "CHECK_EXCEPTION_FAIL_OPEN", resource };
  }
}

/**
 * Retorna o uso completo do workspace + os limites do plano.
 * @param {string} workspaceId
 */
export async function getUsageReport(workspaceId) {
  const sb = await supabaseAdmin();

  const { data: usage } = await sb.rpc("get_workspace_usage", {
    p_workspace_id: workspaceId,
  });

  // Descobre o plano
  const { data: sub } = await sb
    .from("subscriptions")
    .select("plan_id,status,current_period_end")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planId = sub?.plan_id || "piloto";

  const { data: plan } = await sb
    .from("plan_definitions")
    .select("*")
    .eq("plan_id", planId)
    .maybeSingle();

  return {
    plan_id: planId,
    plan: plan || null,
    subscription_status: sub?.status || "trial",
    period_end: sub?.current_period_end || null,
    usage: usage || {},
    limits: plan
      ? {
          leads_month: plan.max_leads_month,
          instances: plan.max_instances,
          users: plan.max_users,
          kb_items: plan.max_kb_items,
        }
      : null,
  };
}

/**
 * Verifica se uma feature/página está liberada no plano do workspace.
 * @param {string} workspaceId
 * @param {string} feature - ex: 'maestro', 'secretario', 'intelligence'
 */
export async function hasFeature(workspaceId, feature) {
  try {
    const report = await getUsageReport(workspaceId);
    const features = report.plan?.features || [];
    return features.includes(feature);
  } catch (e) {
    console.warn("hasFeature exception:", e.message);
    return true; // fail-open
  }
}
