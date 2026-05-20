-- ============================================================================
-- ONE ELEVEN — Catálogo de Planos + Limites de Uso
-- Versão: 1.0 | Data: 2026-05-19
--
-- Define os planos (piloto, essencial, profissional, enterprise) e funções
-- para verificar se um workspace está dentro dos limites do seu plano.
--
-- Uso de recursos é CONTADO AO VIVO das tabelas existentes (sem contador
-- separado que pode dar drift).
-- ============================================================================

-- ============================================================================
-- 1. PLAN_DEFINITIONS — catálogo de planos
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_definitions (
    plan_id          TEXT PRIMARY KEY,            -- piloto | essencial | profissional | enterprise
    name             TEXT NOT NULL,
    price_cents      INTEGER NOT NULL DEFAULT 0,
    max_leads_month  INTEGER NOT NULL,            -- teto de leads processados por mês
    max_instances    INTEGER NOT NULL,            -- nº de WhatsApp conectados
    max_users        INTEGER NOT NULL,            -- nº de membros do workspace
    max_kb_items     INTEGER NOT NULL,            -- itens na base de conhecimento
    max_followup_sequences INTEGER NOT NULL,      -- sequências de follow-up
    features         TEXT[] NOT NULL DEFAULT '{}',-- páginas/recursos liberados
    is_trial         BOOLEAN NOT NULL DEFAULT FALSE,
    trial_days       INTEGER,                     -- só para o piloto
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catálogo inicial
INSERT INTO plan_definitions
    (plan_id, name, price_cents, max_leads_month, max_instances, max_users, max_kb_items, max_followup_sequences, features, is_trial, trial_days, sort_order)
VALUES
    ('piloto', 'Piloto', 0, 300, 1, 2, 9999, 9999,
     ARRAY['overview','convertidos','leads','pipeline','inbox','followups','bot','membros','instancias','secretario','maestro'],
     TRUE, 14, 0),

    ('essencial', 'Essencial', 99700, 500, 1, 2, 50, 2,
     ARRAY['overview','convertidos','leads','pipeline','inbox','followups','bot','membros','instancias','maestro_basico'],
     FALSE, NULL, 1),

    ('profissional', 'Profissional', 199700, 1500, 3, 5, 500, 9999,
     ARRAY['overview','convertidos','leads','pipeline','inbox','followups','bot','membros','instancias','secretario','maestro','intelligence'],
     FALSE, NULL, 2),

    ('enterprise', 'Enterprise', 399700, 6000, 10, 9999, 999999, 9999,
     ARRAY['overview','convertidos','leads','pipeline','inbox','followups','bot','membros','instancias','secretario','maestro','intelligence','priority_support','api_access','custom_training'],
     FALSE, NULL, 3)
ON CONFLICT (plan_id) DO UPDATE SET
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    max_leads_month = EXCLUDED.max_leads_month,
    max_instances = EXCLUDED.max_instances,
    max_users = EXCLUDED.max_users,
    max_kb_items = EXCLUDED.max_kb_items,
    max_followup_sequences = EXCLUDED.max_followup_sequences,
    features = EXCLUDED.features,
    is_trial = EXCLUDED.is_trial,
    trial_days = EXCLUDED.trial_days,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 2. GET_WORKSPACE_USAGE — conta uso atual ao vivo
-- ============================================================================
CREATE OR REPLACE FUNCTION get_workspace_usage(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
    leads_month   INTEGER;
    instances_cnt INTEGER;
    users_cnt     INTEGER;
    kb_cnt        INTEGER;
    month_start   TIMESTAMPTZ;
BEGIN
    month_start := date_trunc('month', NOW());

    -- Leads criados neste mês para o workspace
    SELECT COUNT(*) INTO leads_month
    FROM leads
    WHERE (client_id = p_workspace_id OR workspace_id = p_workspace_id)
      AND created_at >= month_start;

    -- Instâncias de WhatsApp
    BEGIN
        SELECT COUNT(*) INTO instances_cnt
        FROM instances
        WHERE workspace_id = p_workspace_id;
    EXCEPTION WHEN undefined_table THEN
        instances_cnt := 0;
    END;

    -- Usuários / membros
    BEGIN
        SELECT COUNT(*) INTO users_cnt
        FROM workspace_members
        WHERE workspace_id = p_workspace_id;
    EXCEPTION WHEN undefined_table THEN
        users_cnt := 1;
    END;

    -- Itens da base de conhecimento
    BEGIN
        SELECT COUNT(*) INTO kb_cnt
        FROM lead_knowledge
        WHERE client_id = p_workspace_id;
    EXCEPTION WHEN undefined_table THEN
        kb_cnt := 0;
    END;

    RETURN jsonb_build_object(
        'leads_month', COALESCE(leads_month, 0),
        'instances', COALESCE(instances_cnt, 0),
        'users', COALESCE(users_cnt, 1),
        'kb_items', COALESCE(kb_cnt, 0),
        'period_start', month_start
    );
END;
$$;

-- ============================================================================
-- 3. CHECK_WORKSPACE_LIMIT — verifica se o workspace pode usar um recurso
-- ============================================================================
-- Retorna: { allowed: bool, resource, current, limit, plan_id, reason }
CREATE OR REPLACE FUNCTION check_workspace_limit(
    p_workspace_id UUID,
    p_resource TEXT  -- 'leads' | 'instances' | 'users' | 'kb_items'
)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_plan_id   TEXT;
    v_plan      plan_definitions%ROWTYPE;
    v_usage     JSONB;
    v_current   INTEGER;
    v_limit     INTEGER;
    v_allowed   BOOLEAN;
BEGIN
    -- Descobre o plano do workspace via subscriptions
    SELECT plan_id INTO v_plan_id
    FROM subscriptions
    WHERE workspace_id = p_workspace_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    -- Sem assinatura → trata como piloto
    IF v_plan_id IS NULL THEN
        v_plan_id := 'piloto';
    END IF;

    SELECT * INTO v_plan FROM plan_definitions WHERE plan_id = v_plan_id;
    IF NOT FOUND THEN
        SELECT * INTO v_plan FROM plan_definitions WHERE plan_id = 'piloto';
    END IF;

    v_usage := get_workspace_usage(p_workspace_id);

    -- Mapeia recurso → uso atual e limite
    IF p_resource = 'leads' THEN
        v_current := (v_usage->>'leads_month')::INTEGER;
        v_limit := v_plan.max_leads_month;
    ELSIF p_resource = 'instances' THEN
        v_current := (v_usage->>'instances')::INTEGER;
        v_limit := v_plan.max_instances;
    ELSIF p_resource = 'users' THEN
        v_current := (v_usage->>'users')::INTEGER;
        v_limit := v_plan.max_users;
    ELSIF p_resource = 'kb_items' THEN
        v_current := (v_usage->>'kb_items')::INTEGER;
        v_limit := v_plan.max_kb_items;
    ELSE
        RETURN jsonb_build_object('allowed', false, 'reason', 'UNKNOWN_RESOURCE');
    END IF;

    v_allowed := v_current < v_limit;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'resource', p_resource,
        'current', v_current,
        'limit', v_limit,
        'plan_id', v_plan_id,
        'plan_name', v_plan.name,
        'is_trial', v_plan.is_trial,
        'reason', CASE WHEN v_allowed THEN 'OK' ELSE 'LIMIT_REACHED' END
    );
END;
$$;

-- ============================================================================
-- 4. RLS + GRANTS
-- ============================================================================
ALTER TABLE plan_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_definitions_read_all" ON plan_definitions
    FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "plan_definitions_write_service" ON plan_definitions
    FOR ALL TO service_role USING (true);

GRANT EXECUTE ON FUNCTION get_workspace_usage(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_workspace_limit(UUID, TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- FIM DA MIGRATION 0051 — Planos + Limites de Uso
-- ============================================================================
