// src/lib/api.ts
import { getTenant } from "@/lib/tenant";

const API_BASE_URL = String((import.meta as any).env?.VITE_API_BASE_URL || "");

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; debugId?: string; details?: any };

export type LeadStage =
  | "Novo"
  | "Em atendimento"
  | "Qualificado"
  | "Agendado"
  | "Fechado"
  | "Perdido";

export type Lead = {
  id: string;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  stage?: string | null;
  client_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

export type Message = {
  id: string;
  lead_id: string;
  body: string;
  direction: "in" | "out";
  created_at?: string | null;
  [k: string]: any;
};

function buildHeaders() {
  const t = getTenant();

  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // token é obrigatório para /api/workspaces e pro resto do SaaS
  if (t.token) h["x-api-token"] = t.token;

  // workspace_id é obrigatório para endpoints multi-tenant (leads/messages/overview)
  if (t.workspaceId) h["workspace_id"] = t.workspaceId;

  return h;
}

async function request<T>(
  path: string,
  opts?: { method?: string; body?: any }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts?.method || "GET",
      headers: buildHeaders(),
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const json = await res.json().catch(() => null);

    if (json?.ok === true) return { ok: true, data: json.data as T };

    const errMsg =
      json?.error || (res.ok ? "UNKNOWN_ERROR" : `HTTP_${res.status}`);

    return {
      ok: false,
      error: errMsg,
      debugId: json?.debugId,
      details: json?.details,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: "NETWORK_ERROR",
      details: String(e?.message || e),
    };
  }
}

export const api = {
  version: () => request<any>("/api/version"),
  overview: () => request<any>("/api/overview"),

  // ✅ novo
  workspaces: () => request<any[]>("/api/workspaces"),

  leads: () => request<Lead[]>("/api/leads"),

  createLead: (body: {
    name?: string;
    phone?: string;
    notes?: string;
    status?: string;
    stage?: string;
    tags?: any;
  }) => request<Lead>("/api/leads", { method: "POST", body }),

  updateLeadStage: (leadId: string, stage: LeadStage) =>
    request<Lead>(`/api/leads?id=${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      body: { stage },
    }),

  messages: (lead_id: string) =>
    request<Message[]>(
      `/api/messages?lead_id=${encodeURIComponent(lead_id)}`
    ),

  sendMessage: (lead_id: string, body: string) =>
    request<Message>("/api/messages", {
      method: "POST",
      body: { lead_id, body },
    }),
};
