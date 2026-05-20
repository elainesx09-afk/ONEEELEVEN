-- ============================================================================
-- ONE ELEVEN — Seed de Workspace + Token (resolve INVALID_TOKEN_OR_WORKSPACE)
-- ============================================================================
--
-- Rode UMA VEZ no SQL Editor do Supabase.
-- No final, ele MOSTRA os valores que você deve colocar no .env do frontend:
--   VITE_WORKSPACE_ID  e  VITE_API_TOKEN
--
-- Pré-requisito: as tabelas agency, workspaces, clients, api_tokens já existem.
-- Se não existirem, rode antes as migrations base do projeto.
-- ============================================================================

DO $$
DECLARE
    v_agency_id    UUID;
    v_workspace_id UUID;
    v_token        TEXT;
BEGIN
    -- ------------------------------------------------------------------------
    -- 1. AGENCY — usa a existente ou cria
    -- ------------------------------------------------------------------------
    SELECT id INTO v_agency_id FROM agency LIMIT 1;
    IF v_agency_id IS NULL THEN
        INSERT INTO agency (name) VALUES ('ONE ELEVEN Agency')
        RETURNING id INTO v_agency_id;
    END IF;

    -- ------------------------------------------------------------------------
    -- 2. WORKSPACE — reaproveita o primeiro, ou cria "Workspace 1"
    -- ------------------------------------------------------------------------
    SELECT id INTO v_workspace_id FROM workspaces ORDER BY 1 LIMIT 1;
    IF v_workspace_id IS NULL THEN
        v_workspace_id := gen_random_uuid();
        INSERT INTO workspaces (id, name) VALUES (v_workspace_id, 'Workspace 1');
    END IF;

    -- ------------------------------------------------------------------------
    -- 3. CLIENT — mesmo id do workspace (padrão do projeto)
    -- ------------------------------------------------------------------------
    INSERT INTO clients (id, agency_id, name, status)
    VALUES (v_workspace_id, v_agency_id, 'Workspace 1', 'active')
    ON CONFLICT (id) DO UPDATE SET status = 'active';

    -- ------------------------------------------------------------------------
    -- 4. API TOKEN — gera um token novo e ativo (se ainda não houver ativo)
    -- ------------------------------------------------------------------------
    SELECT token INTO v_token
    FROM api_tokens
    WHERE workspace_id = v_workspace_id AND is_active = TRUE
    LIMIT 1;

    IF v_token IS NULL THEN
        v_token := 'oneeleven_' || encode(gen_random_bytes(16), 'hex');
        INSERT INTO api_tokens (id, workspace_id, token, name, is_active)
        VALUES (gen_random_uuid(), v_workspace_id, v_token, 'Token Principal', TRUE);
    END IF;

    -- ------------------------------------------------------------------------
    -- 5. SUBSCRIPTION — inicia no plano piloto (14 dias)
    -- ------------------------------------------------------------------------
    INSERT INTO subscriptions (workspace_id, plan_id, status, billing_cycle, price_cents, current_period_end, updated_at)
    VALUES (v_workspace_id, 'piloto', 'trial', 'monthly', 0, NOW() + INTERVAL '14 days', NOW())
    ON CONFLICT (workspace_id) DO UPDATE SET
        plan_id = 'piloto', status = 'trial', updated_at = NOW();

    -- ------------------------------------------------------------------------
    -- 6. MEMBRO PROPRIETÁRIO — vincula o owner (se a tabela existir)
    -- ------------------------------------------------------------------------
    BEGIN
        INSERT INTO workspace_members (workspace_id, email, role, status)
        VALUES (v_workspace_id, 'elainesx09@gmail.com', 'owner', 'active')
        ON CONFLICT DO NOTHING;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Tabela workspace_members nao existe — pulei o membro.';
    END;

    RAISE NOTICE '====================================================';
    RAISE NOTICE 'SEED CONCLUIDO — copie estes valores para o .env:';
    RAISE NOTICE 'VITE_WORKSPACE_ID = %', v_workspace_id;
    RAISE NOTICE 'VITE_API_TOKEN    = %', v_token;
    RAISE NOTICE '====================================================';
END $$;

-- ============================================================================
-- RESULTADO — copie estas duas linhas para o .env do frontend
-- ============================================================================
SELECT
    w.id   AS "VITE_WORKSPACE_ID",
    t.token AS "VITE_API_TOKEN",
    s.plan_id AS plano,
    s.status  AS status_assinatura
FROM workspaces w
JOIN api_tokens t   ON t.workspace_id = w.id AND t.is_active = TRUE
LEFT JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY w.id
LIMIT 1;
