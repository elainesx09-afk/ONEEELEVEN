# 🔧 GUIA PRÁTICO: Configurar Variáveis de Ambiente

## 📍 PASSO 1: Obter Valores do Supabase

### 1.1 - Abrir Supabase
1. Vá para: https://supabase.com/dashboard
2. Faça login com sua conta
3. Clique no projeto que deseja usar
4. Vá para **Settings** (no rodapé esquerdo)
5. Clique em **API**

### 1.2 - Copiar SUPABASE_URL
```
Na tela de Settings → API, procure por:
"Project URL"

Exemplo: https://abcdefghijkl.supabase.co

✓ Copie esse valor
```

### 1.3 - Copiar SUPABASE_SERVICE_ROLE_KEY
```
Na mesma tela, procure por:
"service_role key"

⚠️ MUITO IMPORTANTE: NÃO escolha "anon_key"
   Tem que ser a chave com "service_role" (a maior e mais secreta)

Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...muito_longo...(300+ caracteres)

✓ Copie esse valor INTEIRO
```

---

## 📍 PASSO 2: Obter API Token e Workspace ID

### 2.1 - Você JÁ tem um workspace?

**Se SIM:** Vá para seção 2.2  
**Se NÃO:** Vá para seção 2.3

### 2.2 - Se já tem workspace existente

Você precisa encontrar:
- **Token** da api_tokens table no Supabase
- **Workspace ID** 

**Via SQL no Supabase:**
1. Abra **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Cole este comando:

```sql
SELECT id, token, workspace_id, is_active FROM api_tokens LIMIT 5;
```

4. Clique em **Execute** (Run icon)
5. Você verá algo como:

| id | token | workspace_id | is_active |
|----|-------|--------------|-----------|
| 123e4567... | pk_test_abc123xyz... | 987f1234... | true |

```
✓ Copie:
  - token → será sua VITE_API_TOKEN
  - workspace_id → será sua VITE_WORKSPACE_ID
```

### 2.3 - Se NÃO tem workspace ainda (CRIAR UM)

**Via SQL no Supabase:**

1. Abra **SQL Editor**
2. Cole este comando para criar um workspace:

```sql
-- 1. Criar cliente/workspace
INSERT INTO clients (id, name, status, created_at)
VALUES (
  gen_random_uuid(),
  'Seu Nome Aqui',
  'active',
  now()
)
RETURNING id;
```

3. Anote o **ID** que retornou

4. Crie um token para esse workspace:

```sql
-- 2. Criar token
INSERT INTO api_tokens (id, token, workspace_id, is_active, name)
VALUES (
  gen_random_uuid(),
  'pk_test_' || gen_random_uuid() || gen_random_uuid(),
  'WORKSPACE_ID_QUE_VOCE_COPIOU',  -- ← use o ID do passo 3
  true,
  'Token Teste'
)
RETURNING token, workspace_id;
```

5. Copie:
   - **token** → VITE_API_TOKEN
   - **workspace_id** → VITE_WORKSPACE_ID

---

## 📍 PASSO 3: Criar .env.local

### 3.1 - Abrir VS Code em seu projeto

```powershell
cd "c:\Users\evely\OneDrive\Documentos\GitHub\ONEEELEVEN"
code .
```

### 3.2 - Criar arquivo .env.local

1. Clique com botão direito na raiz do projeto (Explorer)
2. Selecione **New File**
3. Nomeie como: `.env.local`

### 3.3 - Colar Configurações

Abra `.env.local` e cole isto (substitua os valores):

```env
# ============================================
# FRONTEND (Vite - React)
# ============================================

# URL base da API
# Para desenvolvimento local: http://localhost:3000
# Para produção: https://seu-dominio.vercel.app
VITE_API_BASE_URL=http://localhost:3000

# Token que você copiou do Supabase
VITE_API_TOKEN=pk_test_seu_token_aqui

# Workspace ID que você copiou
VITE_WORKSPACE_ID=seu_workspace_id_aqui

# Supabase para o frontend (OPCIONAL em demo)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# ============================================
# BACKEND (Node.js - Vercel)
# ============================================

# URL do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co

# Chave service role (SECRETA!)
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Ambiente
VERCEL_ENV=development
```

### 3.4 - Substituir os Valores Reais

**Campos para preencher:**

| Campo | Valor de Onde | Exemplo |
|-------|---------------|---------|
| `VITE_API_BASE_URL` | Se testar localmente, deixe `http://localhost:3000` | `http://localhost:3000` |
| `VITE_API_TOKEN` | Da query SQL (coluna `token`) | `pk_test_abc123xyz...` |
| `VITE_WORKSPACE_ID` | Da query SQL (coluna `workspace_id`) | `987f1234-abcd-5678-efgh...` |
| `VITE_SUPABASE_URL` | Supabase Settings → API → Project URL | `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Settings → API → anon public key | `eyJhbGc...` |
| `SUPABASE_URL` | Igual ao `VITE_SUPABASE_URL` | `https://abcd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API → service_role key | `eyJhbGc...` |

**Arquivo Final (exemplo):**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TOKEN=pk_test_3f8e9a2b1c4d5e6f7g8h9i0j
VITE_WORKSPACE_ID=a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p
VITE_SUPABASE_URL=https://xyzabc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://xyzabc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VERCEL_ENV=development
```

### 3.5 - Salvar

**Ctrl + S** para salvar (ou Ctrl + Shift + P → "Save")

---

## 📍 PASSO 4: Testar Localmente

### 4.1 - Terminal 1: Iniciar Backend

```powershell
cd "c:\Users\evely\OneDrive\Documentos\GitHub\ONEEELEVEN"

# Se não tiver vercel-cli instalado:
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install -g vercel

# Depois execute:
vercel dev --yes
```

**Esperado:**
```
> Ready! Available at http://localhost:3000

⚠ Port 3000 already in use
? Use port 3001? (Y/n) Y

> Ready! Available at http://localhost:3001
```

**Se usar porta diferente (3001, 3002):**
- Atualize `VITE_API_BASE_URL` no `.env.local`
- Exemplo: `VITE_API_BASE_URL=http://localhost:3001`

### 4.2 - Terminal 2: Iniciar Frontend

```powershell
cd "c:\Users\evely\OneDrive\Documentos\GitHub\ONEEELEVEN"

npm run dev
```

**Esperado:**
```
  VITE v... ready in ... ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 4.3 - Abrir no Navegador

Vá para: http://localhost:5173

**Você verá:**
- Dashboard carregando
- Se houver leads → mostra tabela
- Se houver erro → mostra no console (F12)

---

## 📍 PASSO 5: Testar Endpoints

### 5.1 - Testar Health Check

Abra um novo terminal PowerShell:

```powershell
$headers = @{
  "x-api-token" = "seu_token_aqui"
  "workspace_id" = "seu_workspace_id_aqui"
  "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/api?r=health" `
  -Headers $headers `
  -Method GET

$response.Content | ConvertFrom-Json | Format-List
```

**Esperado:**
```
ok              : True
data            : @{status=OK; supabase=CONNECTED; ts=2026-03-14T10:30:00.000Z}
```

### 5.2 - Testar GET Leads

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/leads" `
  -Headers $headers `
  -Method GET

$response.Content | ConvertFrom-Json | Format-List
```

**Esperado:**
```
ok    : True
data  : {
          id: "123",
          name: "João Silva",
          phone: "11999999999",
          status: "Novo",
          ...
        }
```

---

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### ❌ "MISSING_VITE_API_BASE_URL"
**Causa:** Não existe `VITE_API_BASE_URL` no .env.local  
**Solução:** Adicione a variável e reinicie `npm run dev`

### ❌ "INVALID_TOKEN_OR_WORKSPACE"
**Causa:** Token/workspace_id inválido ou não existe no banco  
**Solução:** 
1. Verifique se a query SQL retornou dados
2. Copie os valores EXATAMENTE como vieram
3. Não adicione aspas ou espaços

### ❌ "Cannot find module 'vite'"
**Causa:** node_modules não instalado corretamente  
**Solução:**
```powershell
rm -r node_modules
npm install
```

### ❌ "ENOENT: no such file or directory, open '.env.local'"
**Causa:** Arquivo não foi criado  
**Solução:** Crie manualmente via VS Code

### ❌ "Port 3000 already in use"
**Causa:** Outra aplicação usando a porta  
**Solução:** Use `-p 3001` ou feche a outra aplicação
```powershell
vercel dev --yes -l localhost:3001
```

### ❌ "SUPABASE_CONNECTION_FAILED"
**Causa:** URL/chave do Supabase inválida  
**Solução:**
1. Copie novamente de Supabase → Settings → API
2. Certifique-se de usar `service_role_key` (não `anon_key`)

---

## ✅ CHECKLIST FINAL

- [ ] .env.local criado
- [ ] VITE_API_BASE_URL preenchido
- [ ] VITE_API_TOKEN preenchido
- [ ] VITE_WORKSPACE_ID preenchido
- [ ] SUPABASE_URL preenchido
- [ ] SUPABASE_SERVICE_ROLE_KEY preenchido
- [ ] `vercel dev` rodando (Backend)
- [ ] `npm run dev` rodando (Frontend)
- [ ] Navegador: http://localhost:5173 abre
- [ ] Dashboard carrega sem erros
- [ ] API health check responde

---

## 🚀 PRÓXIMOS PASSOS

### Depois que tudo funciona localmente:

1. **Deploy no Vercel:**
```bash
git add .
git commit -m "feat: add env configuration"
git push origin main

# Vercel deploy automático
# Vá para Vercel Dashboard → seu projeto → Settings → Environment Variables
# Adicione as mesmas variáveis lá
```

2. **Testar em Produção:**
```bash
curl https://seu-dominio.vercel.app/api?r=health \
  -H "x-api-token: seu-token" \
  -H "workspace_id: seu-workspace"
```

3. **Conectar ao n8n (opcional)**

---

**Pronto! Agora você tem um sistema completo funcionando localmente!** 🎉

Se tiver dúvidas em algum passo, avise!
