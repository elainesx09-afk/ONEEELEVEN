// POST /api/memory/store
// Armazena memória cognitiva: extrai fatos via Claude, gera embeddings, indexa episódios.
//
// Payload:
//   {
//     lead_id: UUID (required),
//     client_id: UUID (optional),
//     messages: [{role, content, created_at?}],  // novas mensagens a processar
//     event?: { type, title, description?, importance?, metadata? }  // episódio opcional
//   }

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { voyageEmbed, sha256 } from "../_lib/voyage.js";
import { claudeCall, claudeText } from "../_lib/claudeClient.js";

const FACT_EXTRACTION_PROMPT = `Você é um extrator de fatos especialista em vendas imobiliárias.

Analise as mensagens do lead abaixo e extraia APENAS fatos estruturados em JSON.

Categorias permitidas:
- budget       (orçamento, valor disponível)
- timeline     (urgência, prazo, quando quer comprar)
- preference   (tipo de imóvel, localização, quartos, características)
- objection    (preocupações, hesitações)
- profile      (perfil do lead: profissão, família, situação)
- intent       (intenção declarada: comprar, investir, alugar)

Retorne JSON puro neste formato:
{"facts": [
  {"category": "budget", "key": "orcamento_max", "value": "R$ 800.000", "confidence": 0.9},
  {"category": "preference", "key": "tipo_imovel", "value": "apartamento 3 quartos", "confidence": 0.85},
  ...
]}

Regras:
- Confidence entre 0 e 1 (1 = lead afirmou explicitamente)
- value SEMPRE como texto (ex: "R$ 800.000", "3 meses", "3 quartos")
- NUNCA invente fatos não mencionados
- Se nada for extraível, retorne {"facts": []}`;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return fail(res, "METHOD_NOT_ALLOWED", 405);

  try {
    const { lead_id, client_id, messages = [], event } = req.body || {};
    if (!lead_id) return fail(res, "MISSING_LEAD_ID", 400);

    const sb = await supabaseAdmin();
    const results = { facts_added: 0, embeddings_added: 0, episode_added: false };

    // 1. EMBEDDINGS — indexa cada mensagem nova
    if (messages.length > 0) {
      const validMessages = messages.filter((m) => m?.content?.trim());
      if (validMessages.length > 0) {
        const texts = validMessages.map((m) => `[${m.role || "user"}] ${m.content}`);
        let embeddings;
        try {
          embeddings = await voyageEmbed(texts, { inputType: "document" });
        } catch (e) {
          console.error("Voyage embed failed:", e.message);
          // fail soft — continua sem embeddings
          embeddings = null;
        }

        if (embeddings) {
          const rows = await Promise.all(
            validMessages.map(async (m, i) => {
              const content = texts[i];
              const hash = await sha256(content);
              return {
                lead_id,
                client_id: client_id || null,
                source_type: "message",
                source_id: m.id || null,
                content,
                content_hash: hash,
                embedding: embeddings[i],
                model: "voyage-3",
                metadata: { role: m.role, created_at: m.created_at || null },
              };
            })
          );

          const { error: embErr } = await sb
            .from("agent_memory_embeddings")
            .upsert(rows, { onConflict: "content_hash,model", ignoreDuplicates: true });

          if (!embErr) results.embeddings_added = rows.length;
          else console.warn("Embeddings upsert error:", embErr.message);
        }
      }
    }

    // 2. FACTS — extrai fatos estruturados via Claude (se houver mensagens)
    if (messages.length > 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const conversationText = messages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        const claudeResp = await claudeCall({
          system: FACT_EXTRACTION_PROMPT,
          messages: [{ role: "user", content: conversationText }],
          maxTokens: 1024,
          temperature: 0.3,
          cacheSystem: true,
        });

        const rawText = claudeText(claudeResp);
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const facts = parsed.facts || [];

          if (facts.length > 0) {
            const factRows = facts.map((f) => ({
              lead_id,
              client_id: client_id || null,
              category: f.category,
              key: f.key,
              value: String(f.value),
              confidence: typeof f.confidence === "number" ? f.confidence : 0.8,
              source: "extracted",
            }));

            const { error: factErr } = await sb
              .from("agent_memory_facts")
              .upsert(factRows, { onConflict: "lead_id,category,key" });

            if (!factErr) results.facts_added = facts.length;
            else console.warn("Facts upsert error:", factErr.message);
          }
        }
      } catch (e) {
        console.warn("Fact extraction skipped:", e.message);
      }
    }

    // 3. EPISODE — registra evento se fornecido
    if (event && event.type && event.title) {
      const { error: epErr } = await sb.from("agent_memory_episodes").insert({
        lead_id,
        client_id: client_id || null,
        event_type: event.type,
        title: event.title,
        description: event.description || null,
        importance: event.importance || 5,
        agent_stage: event.agent_stage || null,
        metadata: event.metadata || null,
      });

      if (!epErr) results.episode_added = true;
      else console.warn("Episode insert error:", epErr.message);
    }

    return ok(res, results);
  } catch (e) {
    console.error("memory/store error:", e);
    return fail(res, "MEMORY_STORE_FAILED", 500, { detail: e.message });
  }
}
