# 🔗 ONE ELEVEN SaaS — Blueprint de Integração n8n ↔ API

> Versão 2.0 | Todos os endpoints exigem os headers `x-api-token` e `workspace_id`.
> Configure-os como **Credentials** no n8n (nunca em logs!).

---

## ⚙️ Configuração Obrigatória

### Variáveis n8n (`Settings → Variables`)

| Variável | Exemplo | Uso |
|---|---|---|
| `SAAS_BASE_URL` | `https://um-onze-saas.vercel.app` | Base de todas as APIs |
| `EVOLUTION_BASE_URL` | `https://evolution.meudominio.com` | Evolution API |
| `N8N_WEBHOOK_BASE_URL` | `https://meu-n8n.railway.app` | Self-reference para webhooks |
| `WORKSPACE_ID` | `ws_abc123` | Fallback de tenant |

### Credentials n8n (`Settings → Credentials`)

**SaaS API Token** (tipo: HTTP Header Auth)
```
Header: x-api-token
Value:  sk-live-SEU_TOKEN_AQUI
```

**Evolution API Key** (tipo: HTTP Header Auth)
```
Header: apikey
Value:  evo-api-key-SEU_TOKEN_AQUI
```

---

## 📥 1. INBOUND_PIPELINE v2

**Trigger:** Evolution API → Webhook

**Endpoint da Evolution (configurar setWebhook):**
```
POST https://SEU_N8N/webhook/evolution-inbound
```

**Endpoint que o n8n bate no SaaS:**
```
POST {{ $vars.SAAS_BASE_URL }}/api/inbound
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "{{ $json._meta.workspace_id }}",
  "Content-Type": "application/json"
}
```
**Body (gerado pelo node Normaliza Payload):**
```json
{
  "lead": {
    "phone": "5511999999999",
    "name": "João Silva",
    "status": "Novo"
  },
  "message": {
    "body": "Olá, tenho interesse!",
    "direction": "in",
    "type": "text",
    "external_id": "MSG_ID_DA_EVOLUTION",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```
**Resposta esperada:**
```json
{
  "ok": true,
  "data": {
    "client_id": "ws_abc",
    "lead_id": "uuid-do-lead",
    "message_id": "uuid-da-mensagem"
  }
}
```

---

## 📤 2. OUTBOX_PIPELINE v2

**Trigger:** Webhook interno

**Webhook URL (para outros workflows chamarem):**
```
POST {{ $vars.N8N_WEBHOOK_BASE_URL }}/webhook/outbox-send
```
**Body mínimo (texto):**
```json
{
  "workspace_id": "ws_abc",
  "instance": "minha-instancia",
  "to": "5511999999999",
  "text": "Olá! Como posso te ajudar?",
  "lead_id": "uuid-opcional"
}
```
**Body com mídia (imagem):**
```json
{
  "workspace_id": "ws_abc",
  "instance": "minha-instancia",
  "to": "5511999999999",
  "media_type": "image",
  "media_url": "https://exemplo.com/foto.jpg",
  "caption": "Confira nossa oferta!"
}
```
**Body com mídia (documento):**
```json
{
  "workspace_id": "ws_abc",
  "instance": "minha-instancia",
  "to": "5511999999999",
  "media_type": "document",
  "media_url": "https://exemplo.com/proposta.pdf",
  "filename": "proposta.pdf"
}
```

**Endpoint que o OUTBOX bate na Evolution:**
```
POST {{ $vars.EVOLUTION_BASE_URL }}/message/sendText/{{ instance }}
POST {{ $vars.EVOLUTION_BASE_URL }}/message/sendMedia/{{ instance }}
POST {{ $vars.EVOLUTION_BASE_URL }}/message/sendWhatsAppAudio/{{ instance }}
```

**Endpoint que o OUTBOX registra no SaaS após envio:**
```
POST {{ $vars.SAAS_BASE_URL }}/api/messages
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "ws_abc",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "lead_id": "uuid-do-lead",
  "body": "Texto enviado ou [imagem]",
  "direction": "out",
  "type": "text",
  "media_url": null,
  "instance": "minha-instancia",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📊 3. MESSAGE_STATUS_SYNC v2

**Trigger:** Evolution API → Webhook (evento MESSAGE_READ)

**Webhook URL (configurar na Evolution):**
```
POST {{ $vars.N8N_WEBHOOK_BASE_URL }}/webhook/evolution-status
```

**Endpoint que o STATUS_SYNC bate no SaaS:**
```
PATCH {{ $vars.SAAS_BASE_URL }}/api/messages/status
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "{{ $json._meta.workspace_id }}",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "external_id": "MSG_ID_DA_EVOLUTION",
  "status": "read",
  "read_at": "2024-01-15T10:35:00.000Z",
  "updated_at": "2024-01-15T10:35:00.000Z"
}
```
**Resposta de sucesso:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid-mensagem",
    "lead_id": "uuid-lead",
    "status": "read",
    "read_at": "2024-01-15T10:35:00.000Z",
    "external_id": "MSG_ID_DA_EVOLUTION",
    "updated": true
  }
}
```
**Resposta idempotente (já estava lida):**
```json
{
  "ok": true,
  "data": { "updated": false, "reason": "already_read" }
}
```

---

## 🏗️ 4. ONBOARD_INSTANCE v2

**Trigger:** SaaS Frontend → Webhook

**Webhook URL:**
```
POST {{ $vars.N8N_WEBHOOK_BASE_URL }}/webhook/onboard-instance
```
**Body:**
```json
{
  "workspace_id": "ws_abc",
  "instance_name": "minha-instancia-01"
}
```

**Sequência interna do workflow:**

**a) Cria instância na Evolution:**
```
POST {{ $vars.EVOLUTION_BASE_URL }}/instance/create
Body: { "instanceName": "minha-instancia-01", "qrcode": true, "integration": "WHATSAPP-BAILEYS" }
```

**b) Busca QR Code (após Wait de 3s):**
```
GET {{ $vars.EVOLUTION_BASE_URL }}/instance/fetchInstances?instanceName=minha-instancia-01
```

**c) Registra instância no SaaS:**
```
POST {{ $vars.SAAS_BASE_URL }}/api/instances
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "ws_abc",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "instance_name": "minha-instancia-01",
  "status": "qrcode",
  "qr_base64": "BASE64_DO_QR...",
  "qr_code_url": "QR_STRING_DE_PAREAMENTO",
  "workspace_id": "ws_abc",
  "evo_instance_id": "UUID_DA_EVOLUTION",
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

**d) Configura webhook na Evolution:**
```
PUT {{ $vars.EVOLUTION_BASE_URL }}/webhook/set/minha-instancia-01
Body:
{
  "enabled": true,
  "url": "{{ $vars.N8N_WEBHOOK_BASE_URL }}/webhook/evolution-inbound",
  "webhookByEvents": true,
  "webhookBase64": false,
  "events": ["MESSAGES_UPSERT", "MESSAGE_READ", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
}
```

**Resposta final ao SaaS:**
```json
{
  "ok": true,
  "instance_name": "minha-instancia-01",
  "connection_status": "qrcode",
  "qr_base64": "BASE64_DO_QR...",
  "qr_code_url": "QR_STRING",
  "webhook_url": "https://meu-n8n.railway.app/webhook/evolution-inbound"
}
```

---

## ⏰ 5. FOLLOWUP_AUTOMATION v2

**Trigger:** Schedule (a cada 15 minutos)

**a) Busca leads ociosos no SaaS:**
```
GET {{ $vars.SAAS_BASE_URL }}/api/leads/stale
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "{{ $vars.WORKSPACE_ID }}"
}
```
**Query Params:**
```
?status=Novo,Em atendimento
&stale_minutes=60
&limit=30
```
**Resposta:**
```json
{
  "ok": true,
  "data": {
    "data": [
      {
        "id": "uuid-lead",
        "name": "João",
        "phone": "5511999999999",
        "status": "Novo",
        "instance": "minha-instancia-01",
        "last_message_at": "2024-01-15T09:00:00.000Z",
        "followup_sent_at": null
      }
    ],
    "count": 1,
    "stale_minutes": 60
  }
}
```

**b) Para cada lead — chama OUTBOX (via webhook interno):**
```
POST {{ $vars.N8N_WEBHOOK_BASE_URL }}/webhook/outbox-send
Body:
{
  "workspace_id": "ws_abc",
  "instance": "minha-instancia-01",
  "to": "5511999999999",
  "text": "Olá! 👋 Vi que você entrou em contato. Como posso te ajudar hoje?",
  "lead_id": "uuid-lead"
}
```

**c) Após Wait de 10s — marca followup no SaaS:**
```
PATCH {{ $vars.SAAS_BASE_URL }}/api/leads/{{ lead_id }}/followup
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "ws_abc",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "followup_sent_at": "2024-01-15T10:30:00.000Z",
  "followup_text": "Olá! 👋 Vi que você entrou em contato. Como posso te ajudar hoje?"
}
```
**Resposta:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid-lead",
    "status": "Novo",
    "followup_sent_at": "2024-01-15T10:30:00.000Z",
    "followup_text": "Olá! 👋...",
    "workspace_id": "ws_abc"
  }
}
```

---

## 🛡️ 6. ERROR_HANDLER

**Trigger:** Qualquer workflow em erro

**Endpoint para registrar erro no SaaS:**
```
POST {{ $vars.SAAS_BASE_URL }}/api/system/errors
```
**Headers:**
```json
{
  "x-api-token": "CRED_SAAS_API",
  "workspace_id": "ws_abc",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "severity": "CRITICAL",
  "workflow": "OUTBOX_PIPELINE v2",
  "exec_id": "exec_abc123",
  "error_message": "ECONNREFUSED ao chamar Evolution API",
  "workspace_id": "ws_abc",
  "lead_id": "uuid-lead-opcional",
  "is_retryable": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Listar erros (para dashboard):**
```
GET {{ $vars.SAAS_BASE_URL }}/api/system/errors?severity=CRITICAL&resolved=false&limit=50
```

---

## 🔄 Fluxo Completo (Visão Geral)

```
[WhatsApp User]
     │
     ▼
[Evolution API] ──── webhook ────► [n8n INBOUND_PIPELINE]
                                          │
                                          ▼
                                   POST /api/inbound
                                          │
                                          ▼
                                    [Supabase]
                                   leads + messages
                                          │
                       ┌──────────────────┘
                       │
                       ▼
            [n8n FOLLOWUP_AUTOMATION]
            GET /api/leads/stale (cron 15min)
                       │
                       ▼
            POST /webhook/outbox-send
                       │
                       ▼
            [n8n OUTBOX_PIPELINE]
            POST Evolution /message/sendText
                       │
                       ▼
            POST /api/messages (registra)
                       │
                       ▼
            PATCH /api/leads/{id}/followup (marca)

[Evolution READ event]
     │
     ▼
[n8n MESSAGE_STATUS_SYNC]
     │
     ▼
PATCH /api/messages/status

[Any workflow ERROR]
     │
     ▼
[n8n ERROR_HANDLER]
     │
     ▼
POST /api/system/errors
```

---

## 🔒 Checklist de Segurança Multi-Tenant

- [ ] Credential `CRED_SAAS_API` configurada (não hardcoded no JSON)
- [ ] Header `workspace_id` enviado em TODAS as requests ao SaaS
- [ ] Evolution configurada para enviar `workspace_id` no payload do webhook
- [ ] ERROR_HANDLER configurado em cada workflow (Settings → Error Workflow)
- [ ] Variável `WORKSPACE_ID` configurada como fallback
- [ ] Migration `migration_production.sql` executada no Supabase
