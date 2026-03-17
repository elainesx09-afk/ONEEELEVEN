# 🎨 DIAGRAMA VISUAL DO SISTEMA

## 1️⃣ ARQUITETURA GERAL

```
┌───────────────────────────────────────────────────────────────┐
│                    NAVEGADOR DO USUÁRIO                       │
│                   localhost:5173 (dev)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    npm run dev
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
     ┌──▼──────────────────────────────┐   ┌─▼─────────────────────┐
     │    FRONTEND (React + Vite)      │   │  src/lib/api.ts       │
     │                                 │   │                       │
     │  • App.tsx (Router)             │   │  request<T>(path...)  │
     │  • pages/ (11 páginas)          │   │  - buildHeaders()     │
     │  • components/ (UI Shadcn)      │   │  - fetch + error      │
     │  • AuthContext.tsx              │   │  - api.leads()        │
     │                                 │   │  - api.messages()     │
     │  useQuery() + react-query       │   │  - api.*              │
     │                                 │   │                       │
     └──────────────────┬──────────────┘   └─────────────────────┘
                        │
                        │ fetch(
                        │   "${VITE_API_BASE_URL}/api/leads",
                        │   headers: { 
                        │     "x-api-token": token,
                        │     "workspace_id": id
                        │   }
                        │ )
                        │
        ┌───────────────▼────────────────────────────────────┐
        │         BACKEND (Vercel Serverless)               │
        │         localhost:3000 (dev) ou *.vercel.app      │
        │                                                   │
        │  /api/index.js          (health, version)         │
        │  /api/leads.js          (CRUD + stale)           │
        │  /api/messages.js       (GET + POST + status)    │
        │  /api/clients.js        (workspace data)         │
        │  /api/instances.js      (WhatsApp instances)     │
        │  /api/overview.js       (KPIs + dashboard)       │
        │  /api/system.js         (error logs)             │
        │  /api/webhook.js        (webhooks externos)      │
        │  /api/onboarding.js     (novo cliente)           │
        │  /api/ai/[action].js    (IA integration)         │
        │                                                   │
        │  _lib/auth.js           (requireAuth)            │
        │  _lib/response.js       (ok, fail, setCors)      │
        │  _lib/supabaseAdmin.js  (conexão Supabase)       │
        └───────────────┬────────────────────────────────┘
                        │
                        │ sb.from("leads")
                        │   .select()
                        │   .eq("client_id", workspace_id)
                        │
        ┌───────────────▼────────────────────────────┐
        │      BANCO DE DADOS (Supabase)            │
        │    https://seu-projeto.supabase.co        │
        │                                           │
        │  • api_tokens                            │
        │  • clients (workspaces)                  │
        │  • leads                                 │
        │  • messages                              │
        │  • instances                             │
        │  • system_errors                         │
        │  • ... mais tabelas conforme preciso     │
        │                                           │
        │  Autenticação via service_role_key       │
        └───────────────────────────────────────────┘
```

---

## 2️⃣ FLUXO DE AUTENTICAÇÃO

```
┌─────────────────┐
│  Frontend      │
│  (sem login)   │
│                │
│ localStorage:  │
│  token: ???    │
│  workspace: ??? │
└────────┬────────┘
         │
         │ Tela de Login (opcional)
         │
         ▼
┌──────────────────────────┐
│ Frontend (Authenticated) │
│                          │
│ Headers em cada request: │
│ ✓ x-api-token: token    │
│ ✓ workspace_id: id      │
│ ✓ Content-Type: json    │
└────────┬─────────────────┘
         │
         │ fetch /api/leads
         │ + headers
         │
         ▼
┌──────────────────────────────┐
│ Backend: requireAuth()       │
│                              │
│ 1. Extrai token + workspace  │
│ 2. Query: api_tokens table   │
│    SELECT *                  │
│    WHERE token = X           │
│    AND workspace_id = Y      │
│    AND is_active = true      │
│                              │
│ 3. Se encontrou → OK         │
│    Se não → 403 FORBIDDEN    │
└──────┬───────────────────────┘
       │
       ▼
  ✅ Autorizado → Prossegue a requisição
  ❌ Não autorizado → Retorna erro
```

---

## 3️⃣ FLUXO DE DADOS - EXEMPLO: LEADS

```
LEITURA (GET /api/leads)
═════════════════════════

Frontend
  └─ Leads.tsx
     └─ useQuery(["leads"], () => apiGetLeads(workspace))
        │
        └─ Faz fetch GET /api/leads
           headers: { x-api-token, workspace_id }
           │
           ▼
Backend (leads.js)
  └─ handler(req, res)
     └─ requireAuth() ✓
        └─ sb.from("leads")
           .select("*")
           .eq("client_id", workspace_id)
           │
           ▼
Supabase
  └─ Retorna: [
       { id, name, phone, status, ... },
       { id, name, phone, status, ... },
       ...
     ]
           │
           ▼
Backend
  └─ return ok(res, data)
     { ok: true, data: [...] }
           │
           ▼
Frontend
  └─ Recebe resposta
     └─ mapLeads(data) → LeadUI[]
        └─ Re-render tabela
           ✓ Mostra leads

═════════════════════════════════════════════════════════════════

CRIAÇÃO (POST /api/leads)
═════════════════════════

Frontend
  └─ Leads.tsx → Form
     input: { name: "João", phone: "11999999999" }
     └─ onClick: api.createLead({ name, phone })
        │
        └─ Faz fetch POST /api/leads
           body: { name, phone }
           headers: { x-api-token, workspace_id }
           │
           ▼
Backend (leads.js)
  └─ handler(req, res)
     └─ requireAuth() ✓
        └─ Validações
           ✓ name existente?
           ✓ phone válido?
           │
           └─ sb.from("leads")
              .insert({
                client_id: workspace,
                name,
                phone,
                status: "Novo",
                created_at: now
              })
              │
              ▼
Supabase
  └─ INSERT executado
     └─ Retorna lead criado
        { id, name, phone, status, ... }
           │
           ▼
Backend
  └─ return ok(res, newLead)
           │
           ▼
Frontend
  └─ Recebe resposta ✓
     └─ react-query refetch("leads")
        └─ Recarrega lista automaticamente
           ✓ Lead aparece na tabela
```

---

## 4️⃣ ESTRUTURA DE TIPOS

```typescript
// Frontend
┌──────────────────────────────────────┐
│ src/lib/api.ts                       │
│                                      │
│ type ApiResult<T> =                 │
│   | { ok: true, data: T }           │
│   | { ok: false, error, debugId }  │
│                                      │
│ type Lead = {                        │
│   id: string                         │
│   name?: string                      │
│   phone?: string                     │
│   status?: string                    │
│   stage?: LeadStage                  │
│   created_at?: string                │
│ }                                    │
│                                      │
│ const api = {                        │
│   leads: () => request<Lead[]>(...)  │
│   createLead: (body) => request...   │
│   ...                                │
│ }                                    │
└──────────────────────────────────────┘

// Backend
┌──────────────────────────────────────┐
│ api/_lib/response.js                 │
│                                      │
│ ok(res, data, status = 200)         │
│   → { ok: true, data }              │
│                                      │
│ fail(res, error, status = 400)      │
│   → { ok: false, error, debugId }   │
│                                      │
│ setCors(res)                         │
│   → Headers CORS                     │
└──────────────────────────────────────┘

// Banco de Dados
┌──────────────────────────────────────┐
│ Supabase Tables                      │
│                                      │
│ leads {                              │
│   id: uuid                           │
│   client_id: uuid (workspace)        │
│   name: text                         │
│   phone: text                        │
│   status: text                       │
│   created_at: timestamp              │
│   ...                                │
│ }                                    │
│                                      │
│ api_tokens {                         │
│   id: uuid                           │
│   token: text (secret)               │
│   workspace_id: uuid                 │
│   is_active: boolean                 │
│ }                                    │
│                                      │
│ + mais tabelas...                    │
└──────────────────────────────────────┘
```

---

## 5️⃣ SEQUÊNCIA DE INICIALIZAÇÃO

```
1️⃣ npm install
   └─ node_modules/ criado
   
2️⃣ npm run dev (Frontend)
   └─ Vite start em localhost:5173
      └─ Compila React/TypeScript
      └─ Hot reload habilitado
      
3️⃣ vercel dev (Backend)
   └─ Vercel CLI emula API em localhost:3000
      └─ Lê .env.local
      └─ Conecta em Supabase
      
4️⃣ Navegador abre localhost:5173
   └─ React App carrega
   └─ AuthContext inicializa
   └─ verifica localStorage (token)
   
5️⃣ Primeira requisição
   └─ Frontend: fetch(/api/leads)
   └─ Backend: requireAuth() valida
   └─ Supabase: Query executa
   └─ Dados renderizam na UI
   
✅ Sistema Online!
```

---

## 6️⃣ ARQUIVOS CRÍTICOS (MODIFICAR COM CUIDADO)

```
🔴 CRÍTICO
├─ src/lib/api.ts              (hub central de requisições)
├─ api/*                       (todos os handlers)
├─ package.json                (dependências)
└─ vercel.json                 (config de deploy)

🟡 IMPORTANTE
├─ src/App.tsx                 (router)
├─ src/lib/AuthContext.tsx     (autenticação)
├─ .env.local                  (senhas - não commitar!)
└─ tsconfig.json               (tipos TypeScript)

🟢 EXTRAS
├─ public/                     (assets estáticos)
├─ src/components/             (UI components)
└─ src/pages/                  (páginas - mudem com segurança)
```

---

## 7️⃣ CHECKLIST DE DEPLOY

```
ANTES DE FAZER GIT PUSH:
━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] .env.local preenchido com valores reais
[ ] npm run build sem erros
[ ] npm test passando
[ ] Testar localmente: npm run dev + vercel dev
[ ] Verificar se .env.local está em .gitignore
[ ] Nenhum console.log sensível no código
[ ] Remover arquivos temporários

NO VERCEL DASHBOARD:
━━━━━━━━━━━━━━━━━━

[ ] Environment Variables configuradas:
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY
[ ] Domínio customizado (opcional)
[ ] CORS whitelist se necessário

NO SUPABASE DASHBOARD:
━━━━━━━━━━━━━━━━━━

[ ] Todas as tabelas criadas (migration)
[ ] api_tokens table preenchida
[ ] RLS (Row Level Security) configurado
[ ] Índices criados para performance

DEPOIS DO DEPLOY:
━━━━━━━━━━━━━━━

[ ] Testar: curl https://seu-dominio/api?r=health
[ ] Verificar logs no Vercel
[ ] Verificar logs no Supabase
[ ] Monitor de erros ativo
```

---

**Conclusão:** Sistema está bem estruturado e pronto para uso. Basta configurar .env.local e fazer deploy! 🚀
