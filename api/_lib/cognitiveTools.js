// Tool schemas para o motor cognitivo ReAct.
// Cada tool tem: name, description, input_schema (JSON Schema), e um executor.

import { supabaseAdmin } from "./supabaseAdmin.js";
import { voyageEmbed } from "./voyage.js";

// ============================================================================
// TOOL DEFINITIONS — schema que o Claude recebe
// ============================================================================
export const COGNITIVE_TOOLS = [
  {
    name: "get_lead_history",
    description: "Recupera o histórico completo de mensagens de um lead. Use no início para entender o contexto da conversa.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID do lead" },
        limit: { type: "integer", description: "Número máximo de mensagens (padrão 20)", default: 20 },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "recall_memory",
    description: "Recupera a memória cognitiva do lead: fatos extraídos (BANT, preferências), episódios chave, resumos e busca semântica opcional.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID do lead" },
        query: { type: "string", description: "Pergunta semântica opcional para busca vetorial (ex: 'o que ele falou sobre orçamento?')" },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "search_kb",
    description: "Busca na base de conhecimento da empresa (FAQ, scripts, informações de produtos) usando busca semântica.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Pergunta ou tópico para buscar" },
        client_id: { type: "string", description: "UUID do client/empresa para escopar a busca" },
        limit: { type: "integer", description: "Top-K resultados (padrão 5)", default: 5 },
      },
      required: ["query"],
    },
  },
  {
    name: "find_similar_leads",
    description: "Encontra leads parecidos com este (cross-reference). Útil para entender 'leads como este geralmente convertem com X estratégia'.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID do lead base" },
        client_id: { type: "string", description: "UUID do client (escopo)" },
        limit: { type: "integer", default: 5 },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "schedule_action",
    description: "Agenda uma ação futura: follow-up, lembrete, escalação. Use quando precisar voltar a falar com o lead em momento específico.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        action_type: { type: "string", enum: ["followup", "reminder", "escalation"] },
        scheduled_for: { type: "string", description: "ISO datetime, ex: '2026-05-20T14:00:00Z'" },
        notes: { type: "string", description: "Por que essa ação foi agendada" },
      },
      required: ["lead_id", "action_type", "scheduled_for"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Marca o lead como precisando de atendimento humano. Use SOMENTE quando: lead pediu humano explicitamente, conversa muito complexa, ou alta intenção de compra que merece atenção pessoal.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        reason: { type: "string", description: "Por que precisa de humano (será visto pelo atendente)" },
        urgency: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      },
      required: ["lead_id", "reason"],
    },
  },
  {
    name: "send_message",
    description: "Envia a resposta final ao lead via WhatsApp. ESTA é a ação que encerra o turno — só use quando tiver decidido a mensagem definitiva.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        text: { type: "string", description: "Texto da mensagem (PT-BR, humano, curto)" },
        media_url: { type: "string", description: "URL opcional de imagem/áudio/doc" },
      },
      required: ["lead_id", "text"],
    },
  },
];

// ============================================================================
// TOOL EXECUTORS — implementações reais
// ============================================================================

/**
 * Executa uma tool e retorna seu resultado (string ou objeto serializável).
 */
export async function executeTool(name, input, ctx = {}) {
  const sb = await supabaseAdmin();

  switch (name) {
    case "get_lead_history": {
      const { data, error } = await sb
        .from("messages")
        .select("role,content,created_at")
        .eq("lead_id", input.lead_id)
        .order("created_at", { ascending: true })
        .limit(input.limit || 20);

      if (error) return { error: error.message };
      return { messages: data || [], count: (data || []).length };
    }

    case "recall_memory": {
      const recallBody = { lead_id: input.lead_id };
      if (input.query) recallBody.query = input.query;

      const { data, error } = await sb.rpc("recall_lead_memory", { p_lead_id: input.lead_id });
      if (error) return { error: error.message };

      const result = data || {};

      // Adiciona busca semântica se query fornecida
      if (input.query) {
        try {
          const [qVec] = await voyageEmbed(input.query, { inputType: "query" });
          const { data: matches } = await sb.rpc("match_memory_embeddings", {
            query_embedding: qVec,
            p_lead_id: input.lead_id,
            p_client_id: ctx.client_id || null,
            p_source_types: null,
            match_count: 5,
            min_similarity: 0.6,
          });
          result.semantic_matches = matches || [];
        } catch (e) {
          result.semantic_error = e.message;
        }
      }

      return result;
    }

    case "search_kb": {
      try {
        const [qVec] = await voyageEmbed(input.query, { inputType: "query" });
        // Assume que KB foi indexada em agent_memory_embeddings com source_type='kb_item'
        const { data } = await sb.rpc("match_memory_embeddings", {
          query_embedding: qVec,
          p_lead_id: null,
          p_client_id: input.client_id || ctx.client_id || null,
          p_source_types: ["kb_item"],
          match_count: input.limit || 5,
          min_similarity: 0.55,
        });
        return { results: data || [], count: (data || []).length };
      } catch (e) {
        return { error: e.message };
      }
    }

    case "find_similar_leads": {
      const { data, error } = await sb.rpc("find_similar_leads", {
        p_lead_id: input.lead_id,
        p_client_id: input.client_id || ctx.client_id || null,
        match_count: input.limit || 5,
        min_similarity: 0.70,
      });
      if (error) return { error: error.message };
      return { similar: data || [] };
    }

    case "schedule_action": {
      const { error } = await sb.from("scheduled_actions").insert({
        lead_id: input.lead_id,
        action_type: input.action_type,
        scheduled_for: input.scheduled_for,
        notes: input.notes || null,
        status: "pending",
      });
      if (error) {
        // Fallback: registra como episode se a tabela não existir
        await sb.from("agent_memory_episodes").insert({
          lead_id: input.lead_id,
          client_id: ctx.client_id || null,
          event_type: "scheduled_" + input.action_type,
          title: `Agendado: ${input.action_type}`,
          description: input.notes || null,
          importance: 6,
          metadata: { scheduled_for: input.scheduled_for },
        });
        return { ok: true, fallback: "episode" };
      }
      return { ok: true };
    }

    case "escalate_to_human": {
      // Marca lead como precisando humano
      const updates = {
        human_attending: true,
        escalated_at: new Date().toISOString(),
        escalation_reason: input.reason,
      };
      const { error: e1 } = await sb.from("leads").update(updates).eq("id", input.lead_id);

      // Registra episode
      await sb.from("agent_memory_episodes").insert({
        lead_id: input.lead_id,
        client_id: ctx.client_id || null,
        event_type: "handoff",
        title: "Escalado para humano",
        description: input.reason,
        importance: 8,
        metadata: { urgency: input.urgency || "medium" },
      });

      return { ok: !e1, error: e1?.message };
    }

    case "send_message": {
      // Inserir mensagem outbound na fila
      const { data, error } = await sb
        .from("messages")
        .insert({
          lead_id: input.lead_id,
          role: "assistant",
          content: input.text,
          media_url: input.media_url || null,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return { error: error.message };
      return { ok: true, message_id: data.id, queued: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
