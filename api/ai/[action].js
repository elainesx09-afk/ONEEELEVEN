// ============================================================================
// CÉREBRO COGNITIVO V2 - ONE ELEVEN SaaS
// ============================================================================
// 
// Este arquivo substitui: api/ai/[action].ts
// Renomeie para: [action].js (sem TypeScript)
//
// ============================================================================

import { setCors, ok, fail } from "../_lib/response.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

// ============================================================================
// HELPERS
// ============================================================================

async function getBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

// ============================================================================
// ALGORITMO COGNITIVO - CHANCE DE VENDA
// ============================================================================

function calculateIntelligentScore(data) {
  let chance = 30; // base
  let priority = 50; // base

  // ─────────────────────────────────────────────────────────────────
  // FATOR 1: ESTÁGIO (peso: 35%)
  // ─────────────────────────────────────────────────────────────────
  const stageScores = {
    novo: 0,
    em_atendimento: 10,
    qualificando: 15,
    qualificado: 30,
    proposta: 40,
    negociacao: 50,
    agendado: 60,
    fechado: 100,
    perdido: 0,
    pos_venda: 5,
  };

  chance += stageScores[data.stage] || 0;

  // ─────────────────────────────────────────────────────────────────
  // FATOR 2: ENGAJAMENTO (peso: 25%)
  // ─────────────────────────────────────────────────────────────────
  if (data.last_message_from === "lead") {
    chance += 20;
    priority += 25; // Lead respondendo = ALTA PRIORIDADE
  }

  if (data.messages_count > 10) chance += 15;
  else if (data.messages_count > 5) chance += 10;
  else if (data.messages_count > 2) chance += 5;

  // ─────────────────────────────────────────────────────────────────
  // FATOR 3: INTENÇÃO DE COMPRA (peso: 25%)
  // ─────────────────────────────────────────────────────────────────
  if (data.mentioned_price) {
    chance += 15;
    priority += 10;
  }

  if (data.mentioned_schedule) {
    chance += 20;
    priority += 15;
  }

  if (data.mentioned_urgency) {
    chance += 10;
    priority += 20;
  }

  // ─────────────────────────────────────────────────────────────────
  // FATOR 4: TEMPO DE RESPOSTA (peso: 15%)
  // ─────────────────────────────────────────────────────────────────
  if (data.last_interaction_minutes < 5) {
    priority += 30; // QUENTE!
  } else if (data.last_interaction_minutes < 30) {
    priority += 20;
  } else if (data.last_interaction_minutes < 120) {
    priority += 5;
  } else if (data.last_interaction_minutes > 1440) {
    // >24h
    chance -= 20;
    priority -= 15;
  } else if (data.last_interaction_minutes > 4320) {
    // >3 dias
    chance -= 35;
    priority -= 25;
  }

  // ─────────────────────────────────────────────────────────────────
  // FATOR 5: OBJEÇÕES
  // ─────────────────────────────────────────────────────────────────
  if (data.has_objection) {
    chance -= 10;
    priority += 10;
  }

  // ─────────────────────────────────────────────────────────────────
  // NORMALIZAÇÃO (0-100)
  // ─────────────────────────────────────────────────────────────────
  chance = Math.max(1, Math.min(chance, 100));
  priority = Math.max(1, Math.min(priority, 100));

  // ─────────────────────────────────────────────────────────────────
  // CLASSIFICAÇÃO
  // ─────────────────────────────────────────────────────────────────
  let intent_tag = "cold";
  if (chance >= 70) intent_tag = "hot";
  else if (chance >= 40) intent_tag = "warm";

  return {
    chance_de_venda: chance,
    priority_score: priority,
    intent_tag: intent_tag,
  };
}

// ============================================================================
// ENDPOINTS
// ============================================================================

// ─── /api/ai?action=brain ───────────────────────────────────────────────
async function handleBrain(req, res) {
  if (req.method !== "POST") {
    return ok(res, { engine: "cognitive_v2" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();

  try {
    const { lead_id, message } = req.body;
    const text = (message || "").toLowerCase();

    // Detecção inteligente
    let stage = "novo";
    let mentioned_price = false;
    let mentioned_schedule = false;
    let mentioned_urgency = false;
    let has_objection = false;

    // Keywords
    if (
      text.includes("preço") ||
      text.includes("valor") ||
      text.includes("quanto")
    ) {
      stage = "em_atendimento";
      mentioned_price = true;
    }
    if (
      text.includes("agendar") ||
      text.includes("horario") ||
      text.includes("quando")
    ) {
      stage = "qualificado";
      mentioned_schedule = true;
    }
    if (text.includes("confirmar") || text.includes("fechar")) {
      stage = "agendado";
    }
    if (
      text.includes("urgente") ||
      text.includes("hoje") ||
      text.includes("agora")
    ) {
      mentioned_urgency = true;
    }
    if (
      text.includes("caro") ||
      text.includes("muito") ||
      text.includes("pensando")
    ) {
      has_objection = true;
    }

    // Buscar dados do lead
    const { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    const { count: msg_count } = await sb
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", lead_id);

    const messages_count = msg_count || 0;

    const { data: last_msg } = await sb
      .from("messages")
      .select("direction, created_at")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const last_message_from = last_msg?.direction === "in" ? "lead" : "bot";

    const last_interaction_minutes = last_msg
      ? Math.floor((Date.now() - new Date(last_msg.created_at).getTime()) / 60000)
      : 0;

    // Calcular scores
    const scores = calculateIntelligentScore({
      lead_id,
      stage,
      messages_count,
      last_message_from,
      last_interaction_minutes,
      has_objection,
      mentioned_price,
      mentioned_schedule,
      mentioned_urgency,
    });

    // Atualizar lead
    await sb
      .from("leads")
      .update({
        stage,
        chance_de_venda: scores.chance_de_venda,
        priority_score: scores.priority_score,
        intent_tag: scores.intent_tag,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    // Disparar n8n (se configurado)
    if (process.env.N8N_WEBHOOK) {
      fetch(process.env.N8N_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id,
          stage,
          scores,
          message,
        }),
      }).catch((err) => console.error("N8N webhook failed:", err));
    }

    return ok(res, {
      stage,
      ...scores,
      cognitive_engine: "v2",
    });
  } catch (e) {
    console.error(e);
    return fail(res, "AI_ENGINE_ERROR");
  }
}

// ─── /api/ai?action=priority ────────────────────────────────────────────
async function handlePriority(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const {
      lead_id,
      last_message_from,
      messages_count,
      stage,
      last_interaction_minutes,
      mentioned_price,
      mentioned_schedule,
      mentioned_urgency,
      has_objection,
    } = req.body;

    const scores = calculateIntelligentScore({
      lead_id,
      stage,
      messages_count,
      last_message_from,
      last_interaction_minutes,
      mentioned_price,
      mentioned_schedule,
      mentioned_urgency,
      has_objection,
    });

    const sb = await supabaseAdmin();
    await sb
      .from("leads")
      .update({
        priority_score: scores.priority_score,
        chance_de_venda: scores.chance_de_venda,
        intent_tag: scores.intent_tag,
      })
      .eq("id", lead_id);

    return res.json({ ok: true, ...scores });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ─── /api/ai?action=response ────────────────────────────────────────────
async function handleResponse(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  try {
    const body = await getBody(req);
    const { phone, reply, stage } = body;

    if (!phone) return fail(res, "MISSING_PHONE", 400);
    if (!reply) return fail(res, "MISSING_REPLY", 400);

    const { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .eq("phone", phone)
      .maybeSingle();

    if (!lead) return fail(res, "LEAD_NOT_FOUND", 404);

    await sb.from("messages").insert({
      client_id,
      lead_id: lead.id,
      direction: "out",
      body: reply,
      created_at: new Date().toISOString(),
    });

    if (stage) {
      await sb.from("leads").update({ stage }).eq("id", lead.id);
    }

    return ok(res, { success: true });
  } catch (err) {
    console.error(err);
    return fail(res, "INTERNAL_ERROR", 500);
  }
}

// ============================================================================
// ROUTER PRINCIPAL
// ============================================================================

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const action = req.query.action;

  switch (action) {
    case "brain":
      return handleBrain(req, res);
    case "priority":
      return handlePriority(req, res);
    case "response":
      return handleResponse(req, res);
    default:
      return res.status(404).json({
        ok: false,
        error: "AI_ACTION_NOT_FOUND",
        available: ["brain", "priority", "response"],
      });
  }
}
