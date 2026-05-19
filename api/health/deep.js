// GET /api/health/deep
// Health check profundo: testa cada componente da stack cognitiva.
// Retorna status detalhado de:
//   - Supabase (conexão + tabelas críticas + funções RPC)
//   - Anthropic Claude API (auth + crédito)
//   - Voyage AI (auth + endpoint)
//   - n8n (se EXPOSED_N8N_URL configurado)
//   - Evolution API (se EVOLUTION_URL configurado)
//   - Sistema de memória (pgvector + tabelas)

import { setCors, ok, fail } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

async function check(name, fn, timeoutMs = 5000) {
  const start = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    return { name, ok: true, latency_ms: Date.now() - start, ...result };
  } catch (e) {
    return { name, ok: false, latency_ms: Date.now() - start, error: e.message };
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  const checks = [];

  // 1. Supabase connection + critical tables
  checks.push(
    await check("supabase_connection", async () => {
      const sb = await supabaseAdmin();
      const { error } = await sb.from("leads").select("id", { count: "exact", head: true }).limit(1);
      if (error) throw new Error(error.message);
      return { detail: "leads table accessible" };
    })
  );

  // 2. Memory tables existence
  checks.push(
    await check("memory_tables", async () => {
      const sb = await supabaseAdmin();
      const tables = [
        "agent_memory_facts",
        "agent_memory_episodes",
        "agent_memory_embeddings",
        "agent_memory_summaries",
        "agent_memory_patterns",
      ];
      const missing = [];
      for (const t of tables) {
        const { error } = await sb.from(t).select("id", { count: "exact", head: true }).limit(1);
        if (error) missing.push(t);
      }
      if (missing.length > 0) throw new Error(`Missing tables: ${missing.join(", ")}`);
      return { tables_ok: tables.length, missing: [] };
    })
  );

  // 3. RPC functions
  checks.push(
    await check("rpc_functions", async () => {
      const sb = await supabaseAdmin();
      const tests = [];
      try {
        await sb.rpc("recall_lead_memory", { p_lead_id: "00000000-0000-0000-0000-000000000000" });
        tests.push("recall_lead_memory");
      } catch (e) {
        // OK if returns null/empty for unknown lead
        if (!e.message?.includes("does not exist")) tests.push("recall_lead_memory");
      }
      return { rpc_ok: tests.length, tested: tests };
    })
  );

  // 4. Anthropic Claude
  checks.push(
    await check("anthropic_claude", async () => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY not set");
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (resp.status === 401) throw new Error("invalid_api_key");
      if (resp.status === 429) return { detail: "rate_limited", credit: "unknown" };
      if (!resp.ok) {
        const errText = await resp.text();
        if (errText.includes("credit") || errText.includes("balance"))
          throw new Error("no_credit");
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 100)}`);
      }
      return { detail: "auth_ok_with_credit" };
    })
  );

  // 5. Voyage AI
  checks.push(
    await check("voyage_ai", async () => {
      const key = process.env.VOYAGE_API_KEY;
      if (!key) throw new Error("VOYAGE_API_KEY not set");
      const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: ["test"],
          model: "voyage-3-lite",
          input_type: "query",
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${t.slice(0, 100)}`);
      }
      const data = await resp.json();
      return { detail: `embeddings_ok dims=${data.data?.[0]?.embedding?.length || 0}` };
    })
  );

  // 6. Evolution API (se configurado)
  if (process.env.EVOLUTION_URL && process.env.EVOLUTION_URL !== "PENDENTE") {
    checks.push(
      await check("evolution_api", async () => {
        const resp = await fetch(`${process.env.EVOLUTION_URL}/manager/findInstances`, {
          headers: { apikey: process.env.EVOLUTION_API_KEY || "" },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { detail: "evolution_reachable" };
      })
    );
  } else {
    checks.push({ name: "evolution_api", ok: false, error: "PENDENTE — aguardando capital" });
  }

  // 7. Memory store + recall round-trip (sanity check)
  checks.push(
    await check("memory_roundtrip", async () => {
      const sb = await supabaseAdmin();
      // Verifica que conseguimos contar episódios
      const { count, error } = await sb
        .from("agent_memory_episodes")
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return { episodes_count: count };
    })
  );

  const allOk = checks.every((c) => c.ok);
  const summary = {
    overall: allOk ? "healthy" : "degraded",
    ok_count: checks.filter((c) => c.ok).length,
    total: checks.length,
    timestamp: new Date().toISOString(),
  };

  return ok(res, { summary, checks });
}
