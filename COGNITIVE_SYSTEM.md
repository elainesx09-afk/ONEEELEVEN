# Sistema Cognitivo — ONE ELEVEN

Sistema de IA de última geração com memória permanente, raciocínio multi-passo (ReAct), cross-reference semântico e auto-aprendizado.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA 1 — PERCEPÇÃO                             │
│              Webhook Evolution → INBOUND_PIPELINE                   │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA 2 — MEMÓRIA PERMANENTE                    │
│  agent_memory_facts       (fatos: BANT, preferências)               │
│  agent_memory_episodes    (timeline de eventos chave)               │
│  agent_memory_embeddings  (vetores semânticos — pgvector + Voyage)  │
│  agent_memory_summaries   (compressão de contexto)                  │
│  agent_memory_patterns    (procedural — o que funciona)             │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA 3 — RACIOCÍNIO ReAct                      │
│   Claude tool use loop (max 5 passos):                              │
│     Think → Act (tool) → Observe → Think → ...                      │
│   Tools: recall_memory, search_kb, find_similar_leads,              │
│          schedule_action, escalate_to_human, send_message           │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA 4 — AÇÃO                                  │
│             Resposta enviada via Evolution API                      │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA 5 — REFLEXÃO                              │
│   Avaliação pós-ação → padrões procedurais → embeddings → reuso     │
└─────────────────────────────────────────────────────────────────────┘
```

## Endpoints

### Memória
- `POST /api/memory/store` — armazena fatos extraídos, embeddings, episódios
- `POST /api/memory/recall` — recupera memória completa de um lead (facts + episodes + summaries + busca semântica opcional)

### Raciocínio
- `POST /api/cognitive/react` — motor ReAct principal (chama Claude com tool use)
- `POST /api/cognitive/reflect` — avalia ação passada e extrai padrão procedural

### Cross-reference
- `GET  /api/intelligence/similar` — leads similares
- `GET  /api/intelligence/patterns` — padrões aprendidos + estatísticas de conversão
- `POST /api/intelligence/best-response` — sugestão de resposta baseada em sucessos históricos

### Sistema
- `GET  /api/health/deep` — health check end-to-end (Supabase + Claude + Voyage + Evolution + tabelas + RPC)

## Como ativar (passos do GU)

### 1. Aplicar migration no Supabase
- Acesse https://supabase.com/dashboard/project/cpuaflrmrxfovhqvljrw/sql
- Cole o conteúdo de `supabase/migrations/0050_agent_memory_system.sql`
- Execute. Verá: `CREATE EXTENSION` (pgvector), 5 CREATE TABLE, 3 CREATE FUNCTION, RLS policies.

### 2. Configurar variáveis no Vercel
Em https://vercel.com/[seu-projeto]/settings/environment-variables:
```
SUPABASE_URL=https://cpuaflrmrxfovhqvljrw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<pegar do dashboard Supabase>
SUPABASE_ANON_KEY=<pegar do dashboard Supabase>
ANTHROPIC_API_KEY=<sua chave Claude com crédito>
VOYAGE_API_KEY=<sua chave Voyage>
ALLOWED_ORIGINS=https://um-onze-saas.vercel.app
```

### 3. Importar workflow novo no n8n
- Acesse http://localhost:5678
- Workflows → Import from File → `n8n_blueprints/COGNITIVE_AGENT_v1.json`
- Ative o webhook: você terá `http://localhost:5678/webhook/cognitive-agent`

### 4. Configurar Evolution API para chamar o webhook
Quando a Evolution estiver instalada (pós-pagamento), aponte os webhooks dela para:
`http://localhost:5678/webhook/cognitive-agent`

### 5. Testar
```bash
curl https://um-onze-saas.vercel.app/api/health/deep
```

Esperado: `summary.overall = "healthy"` (ou "degraded" se Claude estiver sem crédito).

## Como o sistema aprende

1. **Cada conversa gera embeddings** → fica indexada pra busca semântica
2. **Claude extrai fatos** (orçamento, prazo, etc) → vai para `agent_memory_facts`
3. **Eventos importantes** (objeção, fechamento) → episódios em `agent_memory_episodes`
4. **Após resposta + reação do lead** → `/api/cognitive/reflect` avalia e extrai padrão
5. **Próxima conversa similar** → motor ReAct usa `find_similar_leads` + padrões salvos para responder melhor

## Custos estimados (50 clientes ativos)

| Componente | Plano | Custo |
|---|---|---|
| Claude Sonnet 4.6 | API (uso) | ~R$30-80/mês |
| Voyage AI | Free tier 200M tok | R$0 |
| Supabase | Free tier (até 500MB) | R$0 |
| Vercel | Free tier serverless | R$0 |
| **TOTAL** | | **R$30-80/mês** |

Quando Supabase passar de 500MB, plano Pro = US$25/mês.

## Próximos passos sugeridos

1. **Treinar KB** — popular `agent_memory_embeddings` com `source_type='kb_item'` (FAQ, scripts da empresa)
2. **Backfill** — gerar embeddings das conversas históricas existentes em `messages`
3. **Dashboard de aprendizado** — frontend para ver padrões aprendidos, taxa de sucesso por padrão
4. **A/B testing** — comparar versão cognitiva vs versão sem reflection
