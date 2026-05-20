// GET /api/plan/usage?workspace_id=...
// Retorna o uso atual do workspace + limites do plano + % de consumo.
// Usado pelo frontend para mostrar barras de uso e avisos de "perto do limite".

import { setCors, ok, fail } from "../_lib/response.js";
import { getUsageReport } from "../_lib/planLimits.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const workspaceId = req.query.workspace_id || req.headers["workspace_id"];
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 400);

  try {
    const report = await getUsageReport(workspaceId);

    // Calcula % de consumo por recurso
    const pct = {};
    if (report.limits) {
      const u = report.usage || {};
      pct.leads = report.limits.leads_month
        ? Math.round(((u.leads_month || 0) / report.limits.leads_month) * 100)
        : 0;
      pct.instances = report.limits.instances
        ? Math.round(((u.instances || 0) / report.limits.instances) * 100)
        : 0;
      pct.users = report.limits.users
        ? Math.round(((u.users || 0) / report.limits.users) * 100)
        : 0;
      pct.kb_items = report.limits.kb_items
        ? Math.round(((u.kb_items || 0) / report.limits.kb_items) * 100)
        : 0;
    }

    // Alertas — recursos acima de 80%
    const warnings = Object.entries(pct)
      .filter(([, v]) => v >= 80)
      .map(([k, v]) => ({ resource: k, pct: v, near_limit: v >= 100 }));

    return ok(res, { ...report, usage_pct: pct, warnings });
  } catch (e) {
    console.error("plan/usage error:", e);
    return fail(res, "PLAN_USAGE_FAILED", 500, { detail: e.message });
  }
}
