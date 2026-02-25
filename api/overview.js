// api/overview.js
// ============================================================
// OBJETIVO: Métricas agregadas para o Dashboard Overview
// USADO POR: Página inicial do dashboard (cards do topo)
// ============================================================
// RETORNA:
// - total_leads: Contagem total de leads
// - active_instances: Contagem de instâncias ativas
// - conversion_rate: % de leads convertidos
// - last_activity: Timestamp da última mensagem
// - hot_leads: Leads qualificados + agendados
// - total_messages: Total de mensagens trocadas
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

  try {
    // ============================================================
    // 1) LEADS: Total, Status, Última Atividade
    // ============================================================
    const { data: leads, error: leadsErr } = await sb
      .from("leads")
      .select("id, status, last_message_at")
      .eq("client_id", client_id);

    if (leadsErr) {
      return fail(res, "OVERVIEW_LEADS_FAILED", 500, { details: leadsErr });
    }

    const totalLeads = leads?.length || 0;

    // Conta por status
    const statusCount = (statusName) =>
      (leads || []).filter((l) => l.status === statusName).length;

    const closed = statusCount("Fechado");
    const qualified = statusCount("Qualificado");
    const scheduled = statusCount("Agendado");
    const converted = statusCount("Convertido");
    const sold = statusCount("Vendido");

    // Total de conversões (múltiplos status possíveis)
    const totalConversions = closed + converted + sold;

    // Hot leads (em processo de fechamento)
    const hotLeads = qualified + scheduled;

    // Taxa de conversão
    const conversionRate = totalLeads > 0
      ? Number(((totalConversions / totalLeads) * 100).toFixed(1))
      : 0;

    // ============================================================
    // 2) ÚLTIMA ATIVIDADE (última mensagem recebida)
    // ============================================================
    let lastActivity = null;

    // Opção 1: Busca o last_message_at mais recente dos leads
    const lastMessageTimes = (leads || [])
      .map((l) => l.last_message_at)
      .filter(Boolean)
      .map((t) => new Date(t).getTime());

    if (lastMessageTimes.length > 0) {
      const mostRecent = Math.max(...lastMessageTimes);
      lastActivity = new Date(mostRecent).toISOString();
    }

    // Opção 2: Se não tiver last_message_at, busca direto na tabela messages
    if (!lastActivity) {
      const { data: lastMsg, error: msgErr } = await sb
        .from("messages")
        .select("created_at")
        .eq("client_id", client_id)
        .eq("direction", "in") // Apenas mensagens recebidas
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!msgErr && lastMsg) {
        lastActivity = lastMsg.created_at;
      }
    }

    // ============================================================
    // 3) CONTAGEM DE MENSAGENS
    // ============================================================
    const { count: totalMessages, error: msgCountErr } = await sb
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client_id);

    if (msgCountErr && msgCountErr.code !== "PGRST116") {
      console.error("[OVERVIEW] Erro ao contar mensagens:", msgCountErr);
    }

    // ============================================================
    // 4) CONTAGEM DE INSTÂNCIAS ATIVAS
    // ============================================================
    const { count: activeInstances, error: instancesErr } = await sb
      .from("instances")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client_id)
      .eq("status", "open"); // Status "open" = conectado

    if (instancesErr && instancesErr.code !== "42P01") {
      console.warn("[OVERVIEW] Erro ao contar instâncias:", instancesErr);
    }

    // Se tabela instances não existe, tenta contar todas
    let instancesCount = Number(activeInstances || 0);
    if (instancesErr?.code === "42P01") {
      // Tabela não existe, retorna 0
      instancesCount = 0;
    }

    // ============================================================
    // 5) MÉTRICAS ADICIONAIS
    // ============================================================
    // Followup conversions: leads que receberam followup e converteram
    const followupConversions = (leads || []).filter((l) =>
      l.followup_sent_at &&
      ["Fechado", "Convertido", "Vendido"].includes(l.status)
    ).length;

    // ROI estimado (pode ser calculado baseado em valor médio de conversão)
    // Por enquanto deixo como placeholder
    const roiEstimated = 0;

    // ============================================================
    // 6) RESPONSE FINAL
    // ============================================================
    return ok(res, {
      // Métricas principais (cards do topo)
      total_leads: totalLeads,
      active_instances: instancesCount,
      conversion_rate: conversionRate,
      last_activity: lastActivity,

      // Métricas adicionais
      hot_leads: hotLeads,
      total_messages: Number(totalMessages || 0),
      total_conversions: totalConversions,
      followup_conversions: followupConversions,
      roi_estimated: roiEstimated,

      // Breakdown por status (útil para gráficos)
      status_breakdown: {
        novo: statusCount("Novo"),
        em_atendimento: statusCount("Em atendimento"),
        qualificado: qualified,
        agendado: scheduled,
        fechado: closed,
        perdido: statusCount("Perdido"),
        convertido: converted,
        vendido: sold
      }
    });

  } catch (error) {
    console.error("[OVERVIEW] Erro inesperado:", error);
    return fail(res, "OVERVIEW_UNEXPECTED_ERROR", 500, {
      details: error.message
    });
  }
}
