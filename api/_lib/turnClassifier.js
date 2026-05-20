// Classificador de turno — decide complexidade da mensagem ANTES de chamar o motor.
// Objetivo: economia de custo. Mensagens simples usam Haiku + poucos passos;
// mensagens complexas usam Sonnet + loop completo.
//
// 100% heurístico (custo zero, instantâneo). Sem chamada de API.

const MODEL_HAIKU = "claude-haiku-4-5-20251001";
const MODEL_SONNET = "claude-sonnet-4-6";

// Saudações, confirmações, agradecimentos — turnos triviais
const SIMPLE_RE = /^(oi+|ol[áa]+|e[ -]?a[íi]+|bom dia|boa tarde|boa noite|ok+|okay|blz|beleza|sim|n[ãa]o|obrigad[oa]*|valeu|vlw|t[áa]|ta bom|tá bom|isso|certo|perfeito|show|massa|legal|joia|jóia|entendi|👍|🙏|😊|❤️|👏|combinado|fechado|pode ser)[\s!.,]*$/i;

// Sinais de objeção / negociação / alta complexidade — exige raciocínio completo
const COMPLEX_RE = /\b(car[oa]|pre[çc]o|valor|quanto custa|desconto|financ\w*|parcel\w*|negoci\w*|condi[çc]\w*|compar\w*|concorrente|outro lugar|pensar|vou ver|n[ãa]o sei|d[úu]vida|problema|reclam\w*|cancelar|insatisf\w*|garantia|contrato|jur[íi]dic\w*|advogad\w*|golpe|confi\w*|seguro|arrepend\w*)\b/i;

/**
 * Classifica o turno e retorna a estratégia de execução.
 * @param {string} userMessage - mensagem nova do lead
 * @param {Object} [opts]
 * @param {string} [opts.agentStage] - estágio do funil (QUALIFICACAO sempre é complexo)
 * @param {number} [opts.historyLength] - nº de mensagens no histórico
 * @returns {{complexity, model, maxLoops, recallMemory}}
 */
export function classifyTurn(userMessage, opts = {}) {
  const msg = String(userMessage || "").trim();
  const lower = msg.toLowerCase();
  const len = msg.length;
  const stage = opts.agentStage || "";

  // Estágios que SEMPRE merecem raciocínio completo
  const heavyStages = ["IA_QUALIFICACAO", "IA_AGENDADO"];

  // --- SIMPLE: saudação/confirmação curta, sem sinais de complexidade ---
  if (len <= 25 && SIMPLE_RE.test(lower) && !COMPLEX_RE.test(lower)) {
    return {
      complexity: "simple",
      model: MODEL_HAIKU,
      maxLoops: 2,
      recallMemory: false, // saudação não precisa puxar memória completa
    };
  }

  // --- COMPLEX: objeção, negociação, mensagem longa, ou estágio pesado ---
  if (COMPLEX_RE.test(lower) || len > 280 || heavyStages.includes(stage)) {
    return {
      complexity: "complex",
      model: MODEL_SONNET,
      maxLoops: 5,
      recallMemory: true,
    };
  }

  // --- MODERATE: caso padrão (perguntas normais, pedidos de info) ---
  return {
    complexity: "moderate",
    model: MODEL_SONNET,
    maxLoops: 3,
    recallMemory: true,
  };
}

export { MODEL_HAIKU, MODEL_SONNET };
