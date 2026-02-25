// api/clients.js
// ============================================================
// OBJETIVO: Listar workspaces/clientes com métricas agregadas
// USADO POR: Dashboard página de Clients
// ============================================================
// RETORNA:
// - Nome do cliente
// - Status (active, inactive)
// - Contagem de instâncias vinculadas
// - Contagem de leads vinculados
// - Soma de conversões (Fechado, Vendido)
// - Timestamp da última atividade
// ============================================================

import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

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

  // ============================================================
  // OPÇÃO 1: Single-tenant (retorna apenas o cliente autenticado)
  // OPÇÃO 2: Multi-tenant admin (lista todos os clientes)
  // ============================================================
  // Por padrão, vou implementar single-tenant (mais comum)
  // Se você precisar de multi-tenant admin, remova o filtro .eq("id", client_id)

  try {
    // ============================================================
    // 1) BUSCA DADOS DO CLIENTE
    // ============================================================
    const { data: client, error: clientErr } = await sb
      .from("clients")
      .select("id, name, status, created_at, updated_at")
      .eq("id", client_id)
      .maybeSingle();

    if (clientErr) {
      // Se tabela clients não existe, cria objeto padrão
      if (clientErr.code === "42P01") {
        console.warn("[CLIENTS] Tabela clients não existe, usando fallback");
        return ok(res, {
          clients: [{
            id: client_id,
            name: "Workspace",
            status: "active",
            instances_count: 0,
            leads_count: 0,
            conversions_count: 0,
            last_activity: null,
            created_at: new Date().toISOString()
          }]
        });
      }
      return fail(res, "CLIENT_FETCH_FAILED", 500, { details: clientErr });
    }

    if (!client) {
      return fail(res, "CLIENT_NOT_FOUND", 404);
    }

    // ============================================================
    // 2) CONTAGEM DE INSTÂNCIAS
    // ============================================================
    const { count: instancesCount, error: instancesErr } = await sb
      .from("instances")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client_id);

    if (instancesErr && instancesErr.code !== "42P01") {
      console.error("[CLIENTS] Erro ao contar instâncias:", instancesErr);
    }

    // ============================================================
    // 3) CONTAGEM DE LEADS + CONVERSÕES
    // ============================================================
    const { data: leads, error: leadsErr } = await sb
      .from("leads")
      .select("id, status, last_message_at")
      .eq("client_id", client_id);

    if (leadsErr) {
      return fail(res, "LEADS_FETCH_FAILED", 500, { details: leadsErr });
    }

    const leadsCount = leads?.length || 0;

    // Conversões: status = "Fechado" ou "Vendido" ou "Convertido"
    const CONVERSION_STATUSES = ["Fechado", "Vendido", "Convertido", "Ganho"];
    const conversionsCount = (leads || []).filter((l) =>
      CONVERSION_STATUSES.includes(l.status)
    ).length;

    // ============================================================
    // 4) ÚLTIMA ATIVIDADE (última mensagem do workspace)
    // ============================================================
    let lastActivity = null;

    // Busca o last_message_at mais recente de todos os leads
    const lastMessageTimes = (leads || [])
      .map((l) => l.last_message_at)
      .filter(Boolean)
      .map((t) => new Date(t).getTime());

    if (lastMessageTimes.length > 0) {
      const mostRecent = Math.max(...lastMessageTimes);
      lastActivity = new Date(mostRecent).toISOString();
    }

    // Se não tiver last_message_at, busca a mensagem mais recente
    if (!lastActivity) {
      const { data: lastMsg, error: msgErr } = await sb
        .from("messages")
        .select("created_at")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!msgErr && lastMsg) {
        lastActivity = lastMsg.created_at;
      }
    }

    // ============================================================
    // 5) MONTA RESPONSE
    // ============================================================
    const clientData = {
      id: client.id,
      name: client.name || "Workspace",
      status: client.status || "active",
      instances_count: Number(instancesCount || 0),
      leads_count: leadsCount,
      conversions_count: conversionsCount,
      conversion_rate: leadsCount > 0
        ? Number(((conversionsCount / leadsCount) * 100).toFixed(1))
        : 0,
      last_activity: lastActivity,
      created_at: client.created_at,
      updated_at: client.updated_at
    };

    return ok(res, {
      clients: [clientData], // Array para compatibilidade com UI de lista
      total: 1
    });

  } catch (error) {
    console.error("[CLIENTS] Erro inesperado:", error);
    return fail(res, "CLIENTS_UNEXPECTED_ERROR", 500, {
      details: error.message
    });
  }
}
