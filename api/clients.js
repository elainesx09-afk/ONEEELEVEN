import { setCors, ok } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const client_id = auth.workspace_id;
  const sb = await supabaseAdmin();

  // SEM SUPABASE = MODO DEMO
  if (!sb) {
    return ok(res, {
      clients: [{
        id: client_id,
        name: "Workspace Demo",
        status: "active",
        instances_count: 2,
        leads_count: 0,
        conversions_count: 0,
        conversion_rate: 0,
        last_activity: null,
        created_at: new Date().toISOString()
      }],
      total: 1
    });
  }

  // COM SUPABASE = TENTA BUSCAR DADOS REAIS
  try {
    const { data: client } = await sb
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .maybeSingle();

    if (!client) {
      return ok(res, {
        clients: [{
          id: client_id,
          name: "Workspace",
          status: "active",
          instances_count: 0,
          leads_count: 0,
          conversions_count: 0,
          conversion_rate: 0,
          last_activity: null,
          created_at: new Date().toISOString()
        }],
        total: 1
      });
    }

    let instancesCount = 0;
    let leadsCount = 0;
    let conversionsCount = 0;

    try {
      const { count: ic } = await sb.from("instances").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      instancesCount = Number(ic || 0);
    } catch {}

    try {
      const { data: leads } = await sb.from("leads").select("id, status").eq("client_id", client_id);
      if (leads) {
        leadsCount = leads.length;
        conversionsCount = leads.filter(l => ["Fechado", "Vendido"].includes(l.status)).length;
      }
    } catch {}

    return ok(res, {
      clients: [{
        id: client.id,
        name: client.name || "Workspace",
        status: client.status || "active",
        instances_count: instancesCount,
        leads_count: leadsCount,
        conversions_count: conversionsCount,
        conversion_rate: leadsCount > 0 ? Number(((conversionsCount / leadsCount) * 100).toFixed(1)) : 0,
        last_activity: null,
        created_at: client.created_at
      }],
      total: 1
    });
  } catch (err) {
    console.error("Erro clients:", err);
    return ok(res, {
      clients: [{
        id: client_id,
        name: "Workspace",
        status: "active",
        instances_count: 0,
        leads_count: 0,
        conversions_count: 0,
        conversion_rate: 0,
        last_activity: null,
        created_at: new Date().toISOString()
      }],
      total: 1
    });
  }
}
