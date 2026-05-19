# Próximos passos para GU — Sistema Cognitivo

Sistema cognitivo (Fases 1-5) implementado e commitado em `ce4317e`. Agora você precisa fazer os passos manuais abaixo para o SaaS rodar 100%.

## Status do n8n (auditoria sessão 2026-05-19)

**3 bugs encontrados e corrigidos in-place (sem necessidade de redeploy):**

1. ✅ `fetch is not defined` (14 Code nodes em 6 workflows) — n8n 2.x task runner não expõe `fetch` global. Adicionado polyfill v2 usando `helpers.httpRequest` (RPC method exposto pelo sandbox).
2. ✅ `Code doesn't return items properly` (ENRICHMENT Parse Leads) — multi-output return inválido no `runOnceForAllItems`. Refatorado para single-output.
3. ✅ `Cannot read properties of undefined (reading 'caseSensitive')` (9 IF/Switch nodes em 3 workflows: AB_TEST_ENGINE, INBOUND_PIPELINE, IA_FOLLOWUP) — Conditions sem `options.caseSensitive`. Adicionado.
4. ✅ `Error: Credentials not found` (23 HTTP nodes em 4 workflows: CHURN_PREVENTION, SENTIMENT_ALERT, INTELLIGENT_HANDOFF, INBOUND_PIPELINE) — nodes configurados com `authentication: genericCredentialType` mas credencial deletada. Como o `x-api-key` já é enviado manualmente em headers, mudei `authentication: none`. 

**Workflows ainda a verificar nas próximas execuções:**
- `23_CEREBRO_AUTOVALIDACAO`, `14_CHURN_PREVENTION_v1.1` — falharam mas pré-patch. Próximos crons dirão se ficaram OK.

**Confirmados funcionando após patches:**
- ✅ `21_HEALTH_MONITOR_v1` (cron de 5 min, 96% sucesso histórico)
- ✅ `19_ENRICHMENT_ENGINE_v1.1` (primeira execução pós-patch v2: success em 17:48 UTC)

## 🔴 PASSO 1 — Aplicar migration no Supabase (5 minutos)

1. Acesse https://supabase.com/dashboard/project/cpuaflrmrxfovhqvljrw/sql/new
2. Cole TODO o conteúdo do arquivo `supabase/migrations/0050_agent_memory_system.sql`
3. Clique **Run**
4. Verifique que apareceram:
   - `CREATE EXTENSION` ✅ (pgvector)
   - 5 tabelas criadas (`agent_memory_facts`, `agent_memory_episodes`, etc.)
   - 3 funções RPC (`match_memory_embeddings`, `find_similar_leads`, `recall_lead_memory`)
   - Função `get_unenriched_leads` (consertando bug do ENRICHMENT)

## 🔴 PASSO 2 — Configurar env vars no Vercel (3 minutos)

1. Acesse https://vercel.com → projeto ONE ELEVEN → Settings → Environment Variables
2. Adicione/atualize estas variáveis (Production):

```
SUPABASE_URL                = https://cpuaflrmrxfovhqvljrw.supabase.co
SUPABASE_ANON_KEY           = <pega do dashboard Supabase → Project Settings → API>
SUPABASE_SERVICE_ROLE_KEY   = <pega do dashboard Supabase → Project Settings → API>
ANTHROPIC_API_KEY           = <sua chave Claude com crédito>
VOYAGE_API_KEY              = pa-tv89SgN4A3I0Yi7FQbnjxac8NnBh665y6nO-QnkLumA
VITE_API_BASE_URL           = https://um-onze-saas.vercel.app
ALLOWED_ORIGINS             = https://um-onze-saas.vercel.app
VITE_DEMO_MODE              = false
```

3. Clique **Save** em cada uma
4. Redeploy o projeto (Deployments → ⋯ → Redeploy)

## 🔴 PASSO 3 — Crédito Anthropic Claude (5 minutos, ~R$50)

1. Acesse https://console.anthropic.com/settings/billing
2. Adicione US$10-20 de crédito (~R$50-100)
3. Verifique que `ANTHROPIC_API_KEY` (mesma que está no Vercel) tem permissão de uso

## 🟡 PASSO 4 — Testar o sistema (2 minutos)

```bash
curl https://um-onze-saas.vercel.app/api/health/deep
```

**Resposta esperada:**
```json
{
  "ok": true,
  "data": {
    "summary": { "overall": "healthy", "ok_count": 7, "total": 7 },
    "checks": [...]
  }
}
```

Se algum `check` falhar:
- `supabase_connection`/`memory_tables` falhar → migration não aplicada (passo 1)
- `anthropic_claude` falhar com "no_credit" → adicionar crédito (passo 3)
- `voyage_ai` falhar → verificar `VOYAGE_API_KEY` no Vercel
- `evolution_api` falhar com "PENDENTE" → ✅ esperado, aguarda Evolution API

## 🟡 PASSO 5 — Importar workflow novo no n8n (3 minutos)

1. Abra http://localhost:5678
2. Workflows → Import → File → escolha `n8n_blueprints/COGNITIVE_AGENT_v1.json`
3. Ative o workflow
4. Endpoint webhook ativo: `http://localhost:5678/webhook/cognitive-agent`

## 🟡 PASSO 6 — Atualizar SAAS_BASE_URL no n8n (1 minuto)

O variable do n8n ainda aponta pra URL errada. Como não é editável via API no plano free, faça manualmente:

1. n8n UI → Variables → `SAAS_BASE_URL`
2. Mudar de `https://onze-rubi.vercel.app` para `https://um-onze-saas.vercel.app`
3. Save

## 🟢 PASSO 7 — Quando entrar capital, instalar Evolution API

Conforme `project_one_eleven_capital_priority.md` (memória):
1. Pagar VPS Hostinger Brasil ou Contabo (~R$25-30/mês)
2. Instalar Evolution API via Docker no VPS
3. Configurar webhooks Evolution → `http://seu-n8n-url/webhook/cognitive-agent`
4. Adicionar `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` nas env vars do Vercel

---

## Como o sistema funciona end-to-end (quando tudo estiver configurado)

```
1. WhatsApp → Evolution API → webhook
2. Webhook → n8n COGNITIVE_AGENT
3. n8n → POST /api/cognitive/react (motor ReAct)
4. ReAct loop:
   - recall_memory (fatos, episódios do lead)
   - search_kb (KB da empresa)
   - find_similar_leads (cross-reference)
   - decide resposta
   - send_message (envia via Evolution)
5. /api/memory/store (indexa nova mensagem + extrai fatos)
6. (mais tarde, ao receber resposta do lead)
7. /api/cognitive/reflect (avalia se foi efetivo, salva padrão)
```

Cada conversa **enriquece a memória permanente**. Cada padrão salvo melhora **as próximas conversas** de leads similares. **Auto-aprendizado real**.

---

## Arquivos relevantes deste sistema

- `supabase/migrations/0050_agent_memory_system.sql` — schema completo
- `api/_lib/voyage.js` — embeddings Voyage AI
- `api/_lib/claudeClient.js` — wrapper Claude + tool use
- `api/_lib/cognitiveTools.js` — 7 tools cognitivos
- `api/_lib/reactEngine.js` — loop ReAct
- `api/memory/store.js` + `api/memory/recall.js` — armazenar/recuperar memória
- `api/cognitive/react.js` — motor principal
- `api/cognitive/reflect.js` — reflexão pós-ação
- `api/intelligence/similar.js`, `patterns.js`, `bestResponse.js` — cross-reference
- `api/health/deep.js` — health check profundo
- `n8n_blueprints/COGNITIVE_AGENT_v1.json` — workflow novo simplificado
- `COGNITIVE_SYSTEM.md` — documentação técnica completa

Tudo já está no GitHub (commit `ce4317e`).
