// src/lib/api.ts
import { ensureTenantInitialized, getTenant } from "@/lib/tenant";

const API_BASE_URL = String((import.meta as any).env?.VITE_API_BASE_URL || "").trim();

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
  instance?: string | null;
  last_message_at?: string | null;
  followup_sent_at?: string | null;
  followup_text?: string | null;
  score?: number | null;
  client_id?: string | null;
  workspace_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

export type Message = {
  id: string;
  lead_id: string;
  body: string;
  direction: "in" | "out";
  type?: string | null;
  external_id?: string | null;
  media_url?: string | null;
  read_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  [k: string]: any;
};

export type Instance = {
  id: string;
  instance_name: string;
  status: "qrcode" | "connecting" | "connected" | "disconnected" | "close" | string;
  qr_base64?: string | null;
  qr_code_url?: string | null;
  evo_instance_id?: string | null;
  client_id?: string | null;
  workspace_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

export type ClientData = {
  id: string;
  name: string;
  status: string;
  instances_count: number;
  leads_count: number;
  conversions_count: number;
  conversion_rate: number;
  last_activity?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SystemError = {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  workflow: string;
  exec_id?: string | null;
  error_message?: string | null;
  lead_id?: string | null;
  is_retryable: boolean;
  resolved: boolean;
  created_at: string;
};

function buildHeaders() {
  ensureTenantInitialized();
  const t = getTenant();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t.token) h["x-api-token"] = t.token;
  if (t.workspaceId) h["workspace_id"] = t.workspaceId;
  return h;
}

async function request<T>(
  path: string,
  opts?: { method?: string; body?: any }
): Promise<ApiResult<T>> {
  try {
    if (!API_BASE_URL) {
      return { ok: false, error: "MISSING_VITE_API_BASE_URL" };
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts?.method || "GET",
      headers: buildHeaders(),
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (json?.ok === true) return { ok: true, data: json.data as T };
    const errMsg = json?.error || (res.ok ? "UNKNOWN_ERROR" : `HTTP_${res.status}`);
    return { ok: false, error: errMsg, debugId: json?.debugId, details: json?.details };
  } catch (e: any) {
    return { ok: false, error: "NETWORK_ERROR", details: String(e?.message || e) };
  }
}

export const api = {
  version: () => request<any>("/api/version"),
  overview: () => request<any>("/api/overview"),

  leads: () => request<Lead[]>("/api/leads"),
  createLead: (body: { name?: string; phone?: string; status?: string; stage?: string; tags?: any }) =>
    request<Lead>("/api/leads", { method: "POST", body }),
  updateLeadStage: (leadId: string, stage: LeadStage) =>
    request<Lead>(`/api/leads?id=${encodeURIComponent(leadId)}`, { method: "PATCH", body: { stage } }),

  messages: (lead_id: string) =>
    request<Message[]>(`/api/messages?lead_id=${encodeURIComponent(lead_id)}`),
  sendMessage: (lead_id: string, body: string) =>
    request<Message>("/api/messages", { method: "POST", body: { lead_id, body } }),

  instances: () => request<Instance[]>("/api/instances"),
  createInstance: (body: { instance_name: string; status?: string; qr_base64?: string | null; qr_code_url?: string | null }) =>
    request<Instance>("/api/instances", { method: "POST", body }),
  updateInstance: (instanceName: string, updates: { status?: string; qr_base64?: string | null }) =>
    request<Instance>(`/api/instances?instance_name=${encodeURIComponent(instanceName)}`, { method: "PATCH", body: updates }),

  clients: () => request<{ clients: ClientData[]; total: number }>("/api/clients"),

  systemErrors: (params?: { severity?: string; resolved?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set("severity", params.severity);
    if (params?.resolved !== undefined) qs.set("resolved", String(params.resolved));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ errors: SystemError[]; count: number }>(`/api/system/errors${q}`);
  },
  resolveError: (errorId: string) =>
    request<any>(`/api/system/errors?id=${encodeURIComponent(errorId)}`, { method: "PATCH" }),

  inboundPing: () => request<any>("/api/inbound"),
};
