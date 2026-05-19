-- ============================================================================
-- ONE ELEVEN — Sistema de Memória Permanente para Agentes Cognitivos
-- Versão: 1.0 | Data: 2026-05-19
--
-- Arquitetura de 4 camadas de memória:
--   1. FACTS         — fatos estruturados extraídos das conversas (BANT, etc)
--   2. EPISODES      — eventos chave na timeline do lead (handoff, objeção, fechamento)
--   3. EMBEDDINGS    — vetores semânticos de mensagens para busca por similaridade
--   4. SUMMARIES     — resumos comprimidos a cada N mensagens
--
-- Dependências:
--   - pgvector extension
--   - tabelas existentes: leads, messages
-- ============================================================================

-- ============================================================================
-- 0. EXTENSÃO PGVECTOR
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. AGENT_MEMORY_FACTS
-- Fatos estruturados extraídos das conversas (rápida recuperação por chave)
-- Exemplo: { lead_id, category: 'budget', key: 'orcamento_max', value: 'R$ 800k' }
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_memory_facts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       UUID NOT NULL,
    client_id     UUID,
    category      TEXT NOT NULL,                              -- budget, timeline, preference, objection, ...
    key           TEXT NOT NULL,                              -- ex: 'imovel_tipo', 'orcamento_max', 'urgencia'
    value         TEXT NOT NULL,                              -- valor extraído (sempre como texto)
    value_jsonb   JSONB,                                      -- estrutura opcional (para multi-valor)
    confidence    NUMERIC(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
    source        TEXT DEFAULT 'extracted',                   -- extracted | confirmed | inferred | manual
    extracted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ,                                -- TTL opcional
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lead_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_amf_lead ON agent_memory_facts (lead_id);
CREATE INDEX IF NOT EXISTS idx_amf_lead_cat ON agent_memory_facts (lead_id, category);
CREATE INDEX IF NOT EXISTS idx_amf_client ON agent_memory_facts (client_id);
CREATE INDEX IF NOT EXISTS idx_amf_category ON agent_memory_facts (category);

-- ============================================================================
-- 2. AGENT_MEMORY_EPISODES
-- Eventos chave na timeline do lead — narrativa
-- Exemplo: { lead_id, event_type: 'objection', title: 'Achou caro', timestamp }
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_memory_episodes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       UUID NOT NULL,
    client_id     UUID,
    event_type    TEXT NOT NULL,                              -- first_contact | qualification | objection | handoff | meeting | sale | churn
    title         TEXT NOT NULL,                              -- resumo curto do evento
    description   TEXT,                                       -- contexto detalhado
    importance    SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    agent_stage   TEXT,                                       -- IA_NOVO | IA_ATENDIMENTO | IA_QUALIFICACAO | ...
    metadata      JSONB,                                      -- dados estruturados extras
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ame_lead ON agent_memory_episodes (lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ame_event_type ON agent_memory_episodes (event_type);
CREATE INDEX IF NOT EXISTS idx_ame_client ON agent_memory_episodes (client_id);
CREATE INDEX IF NOT EXISTS idx_ame_importance ON agent_memory_episodes (importance DESC, occurred_at DESC);

-- ============================================================================
-- 3. AGENT_MEMORY_EMBEDDINGS
-- Vetores semânticos das mensagens (busca por similaridade)
-- Voyage AI voyage-3 retorna 1024 dimensões
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_memory_embeddings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       UUID NOT NULL,
    client_id     UUID,
    source_type   TEXT NOT NULL,                              -- message | summary | episode | fact | kb_item
    source_id     UUID,                                       -- ref ao message_id / episode_id / fact_id
    content       TEXT NOT NULL,                              -- conteúdo textual original
    content_hash  TEXT NOT NULL,                              -- SHA256 para dedup
    embedding     vector(1024),                               -- voyage-3 = 1024 dims
    model         TEXT NOT NULL DEFAULT 'voyage-3',
    metadata      JSONB,                                      -- ex: { role, timestamp, intent }
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (content_hash, model)
);

CREATE INDEX IF NOT EXISTS idx_amemb_lead ON agent_memory_embeddings (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_amemb_client ON agent_memory_embeddings (client_id);
CREATE INDEX IF NOT EXISTS idx_amemb_source ON agent_memory_embeddings (source_type, source_id);

-- IVFFlat index para busca vetorial (otimizado para datasets até ~1M vetores)
CREATE INDEX IF NOT EXISTS idx_amemb_vec_cos
  ON agent_memory_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- 4. AGENT_MEMORY_SUMMARIES
-- Resumos comprimidos a cada N mensagens (compressão de contexto)
-- Sempre referenciam o range de mensagens cobertas
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_memory_summaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID NOT NULL,
    client_id       UUID,
    summary         TEXT NOT NULL,                            -- resumo gerado por Claude
    message_range   INT4RANGE,                                -- ex: [1, 10) = mensagens 1 até 9
    message_count   INTEGER NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    key_topics      TEXT[],                                   -- tópicos extraídos
    sentiment       TEXT,                                     -- positive | neutral | negative
    embedding       vector(1024),                             -- embedding do resumo
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ams_lead ON agent_memory_summaries (lead_id, period_start);
CREATE INDEX IF NOT EXISTS idx_ams_client ON agent_memory_summaries (client_id);

-- ============================================================================
-- 5. AGENT_MEMORY_PATTERNS (procedural — o que funciona / o que falha)
-- Aprendizado: padrões que levaram a sucesso ou falha
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_memory_patterns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID,
    pattern_type    TEXT NOT NULL,                            -- closing_script | objection_handling | qualification | followup_timing
    context         TEXT NOT NULL,                            -- descrição do contexto onde o padrão se aplica
    action          TEXT NOT NULL,                            -- o que foi feito
    outcome         TEXT NOT NULL,                            -- success | failure | neutral
    confidence      NUMERIC(3,2) DEFAULT 0.50,
    sample_size     INTEGER DEFAULT 1,                        -- quantas vezes esse padrão foi observado
    context_embedding vector(1024),                           -- pra busca por contexto similar
    metadata        JSONB,
    last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amp_client_type ON agent_memory_patterns (client_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_amp_outcome ON agent_memory_patterns (outcome, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_amp_ctx_vec
  ON agent_memory_patterns
  USING ivfflat (context_embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================================================
-- 6. FUNÇÕES RPC PARA RECALL
-- ============================================================================

-- Busca semântica em embeddings
CREATE OR REPLACE FUNCTION match_memory_embeddings(
    query_embedding vector(1024),
    p_lead_id UUID DEFAULT NULL,
    p_client_id UUID DEFAULT NULL,
    p_source_types TEXT[] DEFAULT NULL,
    match_count INT DEFAULT 10,
    min_similarity NUMERIC DEFAULT 0.65
)
RETURNS TABLE (
    id UUID,
    lead_id UUID,
    source_type TEXT,
    source_id UUID,
    content TEXT,
    metadata JSONB,
    similarity NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.lead_id,
        e.source_type,
        e.source_id,
        e.content,
        e.metadata,
        (1 - (e.embedding <=> query_embedding))::NUMERIC AS similarity,
        e.created_at
    FROM agent_memory_embeddings e
    WHERE (p_lead_id IS NULL OR e.lead_id = p_lead_id)
      AND (p_client_id IS NULL OR e.client_id = p_client_id)
      AND (p_source_types IS NULL OR e.source_type = ANY(p_source_types))
      AND (1 - (e.embedding <=> query_embedding)) >= min_similarity
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Busca leads similares (cross-reference)
CREATE OR REPLACE FUNCTION find_similar_leads(
    p_lead_id UUID,
    p_client_id UUID DEFAULT NULL,
    match_count INT DEFAULT 5,
    min_similarity NUMERIC DEFAULT 0.70
)
RETURNS TABLE (
    similar_lead_id UUID,
    similarity NUMERIC,
    matched_content TEXT,
    matched_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    target_embeddings vector(1024)[];
BEGIN
    -- Pega os últimos embeddings desse lead
    SELECT ARRAY(
        SELECT e.embedding
        FROM agent_memory_embeddings e
        WHERE e.lead_id = p_lead_id
        ORDER BY e.created_at DESC
        LIMIT 5
    ) INTO target_embeddings;

    IF array_length(target_embeddings, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Busca leads cujos embeddings batem com qualquer um dos target
    RETURN QUERY
    SELECT DISTINCT ON (e.lead_id)
        e.lead_id AS similar_lead_id,
        MAX(1 - (e.embedding <=> ANY(target_embeddings)))::NUMERIC AS similarity,
        e.content AS matched_content,
        e.created_at AS matched_at
    FROM agent_memory_embeddings e
    WHERE e.lead_id != p_lead_id
      AND (p_client_id IS NULL OR e.client_id = p_client_id)
      AND EXISTS (
        SELECT 1 FROM unnest(target_embeddings) t(emb)
        WHERE (1 - (e.embedding <=> t.emb)) >= min_similarity
      )
    GROUP BY e.lead_id, e.content, e.created_at
    ORDER BY e.lead_id, similarity DESC
    LIMIT match_count;
END;
$$;

-- Recuperar memória completa de um lead (todas as 4 camadas)
CREATE OR REPLACE FUNCTION recall_lead_memory(p_lead_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'lead_id', p_lead_id,
        'facts', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'category', category,
                'key', key,
                'value', value,
                'confidence', confidence
            ) ORDER BY category, key)
            FROM agent_memory_facts
            WHERE lead_id = p_lead_id
              AND (expires_at IS NULL OR expires_at > NOW())
        ), '[]'::jsonb),
        'episodes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'event_type', event_type,
                'title', title,
                'description', description,
                'importance', importance,
                'occurred_at', occurred_at
            ) ORDER BY occurred_at DESC)
            FROM agent_memory_episodes
            WHERE lead_id = p_lead_id
        ), '[]'::jsonb),
        'summaries', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'summary', summary,
                'period_start', period_start,
                'period_end', period_end,
                'sentiment', sentiment,
                'key_topics', key_topics
            ) ORDER BY period_start DESC)
            FROM agent_memory_summaries
            WHERE lead_id = p_lead_id
        ), '[]'::jsonb),
        'last_updated', GREATEST(
            COALESCE((SELECT MAX(updated_at) FROM agent_memory_facts WHERE lead_id = p_lead_id), '1970-01-01'::TIMESTAMPTZ),
            COALESCE((SELECT MAX(created_at) FROM agent_memory_episodes WHERE lead_id = p_lead_id), '1970-01-01'::TIMESTAMPTZ)
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- ============================================================================
-- 7. RLS — Row Level Security
-- ============================================================================
ALTER TABLE agent_memory_facts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_episodes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_embeddings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_summaries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_patterns    ENABLE ROW LEVEL SECURITY;

-- Service role tem acesso total
CREATE POLICY "service_role_all_facts"      ON agent_memory_facts      FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_episodes"   ON agent_memory_episodes   FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_embeddings" ON agent_memory_embeddings FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_summaries"  ON agent_memory_summaries  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_patterns"   ON agent_memory_patterns   FOR ALL TO service_role USING (true);

-- Anon role: read-only via API (será mediado pelo nosso backend)
CREATE POLICY "anon_read_facts"      ON agent_memory_facts      FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_episodes"   ON agent_memory_episodes   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_summaries"  ON agent_memory_summaries  FOR SELECT TO anon USING (true);

-- ============================================================================
-- 8. FUNÇÃO AUXILIAR — get_unenriched_leads (descoberta no audit do n8n)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unenriched_leads(limit_count INTEGER DEFAULT 50)
RETURNS SETOF leads
LANGUAGE sql STABLE AS $$
    SELECT *
    FROM leads
    WHERE (
        name IS NULL
        OR name = ''
        OR profile_completeness IS NULL
        OR profile_completeness < 0.5
    )
    AND (status IS NULL OR status NOT IN ('deleted', 'spam'))
    ORDER BY created_at DESC
    LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_unenriched_leads(INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_memory_embeddings(vector, UUID, UUID, TEXT[], INT, NUMERIC) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_leads(UUID, UUID, INT, NUMERIC) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.recall_lead_memory(UUID) TO service_role, authenticated, anon;

-- ============================================================================
-- 9. TRIGGER — updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION agent_memory_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_amf_touch ON agent_memory_facts;
CREATE TRIGGER trg_amf_touch
    BEFORE UPDATE ON agent_memory_facts
    FOR EACH ROW EXECUTE FUNCTION agent_memory_touch_updated_at();

-- ============================================================================
-- FIM DA MIGRATION 0050 — Sistema de Memória Permanente
-- ============================================================================
