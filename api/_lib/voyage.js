// Voyage AI helper — embeddings semânticos para o sistema de memória cognitiva.
// Free tier: 200M tokens/mês. Mais que suficiente para milhares de leads.
// Model: voyage-3 (1024 dims, melhor qualidade) ou voyage-3-lite (512 dims, mais barato).

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

/**
 * Gera embeddings para uma ou mais strings de texto.
 * @param {string|string[]} input - texto único ou lista
 * @param {Object} opts
 * @param {"document"|"query"} opts.inputType - "document" para indexar, "query" para buscar
 * @param {"voyage-3"|"voyage-3-lite"|"voyage-3-large"} opts.model
 * @returns {Promise<number[][]>} - array de vetores
 */
export async function voyageEmbed(input, opts = {}) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

  const texts = Array.isArray(input) ? input : [input];
  if (texts.length === 0) return [];
  if (texts.length > 128) throw new Error("Voyage: max 128 inputs per call");

  const body = {
    input: texts,
    model: opts.model || "voyage-3",
    input_type: opts.inputType || "document",
    truncation: true,
  };

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

/**
 * Helper SHA256 para content_hash (dedup).
 */
export async function sha256(text) {
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(text).digest("hex");
}
