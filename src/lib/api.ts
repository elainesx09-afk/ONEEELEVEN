// src/lib/api.ts
// Cliente único de API para o front (Vite). Sempre envia headers multi-tenant.

export type LeadStage =
  | "Novo"
  | "Em atendimento"
  | "Qualificado"
  | "Agendado"
  | "Fechado"
  | "Perdido";

export type Lead = {
  id: string;
  workspace_id: string;
  name?: string | null;
  phone?: string | null;
  stage: LeadStage;
  status?: string | null; // alguns endpoints retornam status também
  notes?: string | null;
  tags?: any;
  score?: number | null;
  source?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  responsible?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MessageDirection = "in" | "out";

export type Message = {
  id: string;
  workspace_id: string;
  lead_id: string;
  direction: MessageDirection;
  body: string;
  created_at?: string;
};

export type Overview = {
  total_messages: number;
  hot_leads: number;
  conversion_rate: number;
  followup_conversions: number;
  roi_estimated: number;
};

type ApiError = {
  ok: false;
  error: string;
  debugId?: string;
  details?: unknown;
};

type ApiOk<T> = {
  ok: true;
  data: T;
  debugId?: string;
};

type ApiResult<T> = ApiOk<T> | ApiError;

function getBaseUrl() {
  const base = (import.meta as any).env?.VITE_API_BASE_URL || "";
  return String(base || "").replace(/\/$/, "");
}

function getHeaders(extra?: Record<string, string>) {
  const token = String((import.meta as any).env?.VITE_API_TOKEN || "");
  const workspaceId = String((import.meta as any).env?.VITE_WORKSPACE_ID || "");

  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { "x-api-token": token } : {}),
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
    ...(extra || {}),
  };

  return h;
}

function pickDetails(json: any, text: string) {
  // seu backend agora usa fail(..., { details }) mas embrulha em meta
  if (json?.meta?.details !== undefined) return json.meta.details;
  if (json?.details !== undefined) return json.details;
  return json ?? text;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...getHeaders(),
        ...(init?.headers || {}),
      },
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        error: json?.error || `HTTP_${res.status}`,
        debugId: json?.debugId,
        details: pickDetails(json, text),
      };
    }

    // padrões aceitos:
    // 1) { ok:true, data: ... }
    // 2) retorno direto (array/objeto)
    if (json && typeof json === "object" && "ok" in json && "data" in json) {
      return json as ApiOk<T>;
    }

    return { ok: true, data: (json ?? (text as any)) as T };
  } catch (e: any) {
    return {
      ok: false,
      error: "NETWORK_ERROR",
      details: String(e?.message || e),
    };
  }
}

// ✅ Export exigido por páginas (Inbox.tsx importa { api, type Lead, type Message })
export const api = {
  async version() {
    return request<any>("/api/version");
  },

  async overview() {
    return request<Overview>("/api/overview");
  },

  async leads() {
    return request<Lead[]>("/api/leads");
  },

  async createLead(payload: {
    name: string;
    phone: string;
    notes?: string | null;
    stage?: LeadStage;
    status?: LeadStage;
    tags?: any;
    score?: number | null;
    source?: string | null;
  }) {
    // backend aceita stage/status e normaliza para status
    return request<Lead>("/api/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLeadStage(leadId: string, stage: LeadStage) {
    return request<Lead>(`/api/leads?id=${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
  },

  async messages(leadId: string) {
    return request<Message[]>(`/api/messages?lead_id=${encodeURIComponent(leadId)}`);
  },

  async sendMessage(leadId: string, body: string) {
    return request<Message>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ lead_id: leadId, body }),
    });
  },
};
