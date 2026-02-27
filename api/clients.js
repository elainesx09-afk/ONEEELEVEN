// GET /api/clients             → dados do workspace atual com métricas
// GET /api/workspaces          → lista workspaces (via rewrite ?route=workspaces)
import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb  = await supabaseAdmin();
  const cid = auth.workspace_id;

  // ── GET /api/workspaces ───────────────────────────────────
  if (req.query?.route === "workspaces") {
    const a = await sb.from("workspaces").select("id,name,created_at").order("created_at", { ascending: false });
    if (!a.error) return ok(res, a.data ?? []);
    const b = await sb.from("clients").select("id,name,created_at").order("created_at", { ascending: false });
    if (b.error) return fail(res, "WORKSPACES_FETCH_FAILED", 500);
    return ok(res, b.data ?? []);
  }

  // ── GET /api/clients ──────────────────────────────────────
  try {
    const { data: client } = await sb.from("clients").select("id,name,status,created_at")
      .eq("id", cid).maybeSingle();

    const { count: instCount } = await sb.from("instances")
      .select("id", { count: "exact", head: true }).eq("client_id", cid);

    const { data: leads } = await sb.from("leads")
      .select("id,status,last_message_at").eq("client_id", cid);

    const all    = leads ?? [];
    const closed = all.filter(l => ["Fechado","Vendido","Convertido"].includes(l.status)).length;
    const times  = all.map(l => l.last_message_at).filter(Boolean).map(t => new Date(t).getTime());
    const lastActivity = times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;

    return ok(res, {
      clients: [{
        id: client?.id || cid,
        name: client?.name || "Workspace",
        status: client?.status || "active",
        instances_count: Number(instCount || 0),
        leads_count: all.length,
        conversions_count: closed,
        conversion_rate: all.length > 0 ? Number(((closed / all.length) * 100).toFixed(1)) : 0,
        last_activity: lastActivity,
        created_at: client?.created_at,
      }],
      total: 1,
    });
  } catch (e) {
    return fail(res, "CLIENTS_UNEXPECTED_ERROR", 500, { details: e.message });
  }
}
