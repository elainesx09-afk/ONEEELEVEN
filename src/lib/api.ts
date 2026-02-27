// src/lib/api.ts
import { ensureTenantInitialized, getTenant } from "@/lib/tenant";

const API_BASE_URL = String((import.meta as any).env?.VITE_API_BASE_URL || "").trim();

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; debugId?: string; details?: any };

export type LeadStage = "Novo" | "Em atendimento" | "Qualificado" | "Agendado" | "Fechado" | "Perdido";

export type Lead = {
  id: string; name?: string | null; phone?: string | null;
  status?: string | null; stage?: string | null;
  client_id?: string | null; created_at?: string | null;
  [k: string]: any;
};

export type Message = {
  id: string; lead_id: string; body: string;
  direction: "in" | "out"; created_at?: string | null;
  [k: string]: any;
};

function buildHeaders() {
  ensureTenantInitialized();
  const t = getTenant();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t.token)       h["x-api-token"]  = t.token;
  if (t.workspaceId) h["workspace_id"] = t.workspaceId;
  return h;
}

async function request<T>(path: string, opts?: { method?: string; body?: any }): Promise<ApiResult<T>> {
  try {
    if (!API_BASE_URL) return { ok: false, error: "MISSING_VITE_API_BASE_URL" };
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
  health:    () => request<any>("/api?r=health"),
  version:   () => request<any>("/api?r=version"),
  whoami:    () => request<any>("/api?r=whoami"),

  overview:  () => request<any>("/api/overview"),
  clients:   () => request<any>("/api/clients"),
  workspaces: () => request<any[]>("/api/workspaces"),

  leads:           () => request<Lead[]>("/api/leads"),
  createLead:      (body: { name?: string; phone?: string; status?: string; tags?: any }) =>
    request<Lead>("/api/leads", { method: "POST", body }),
  updateLeadStage: (leadId: string, stage: LeadStage) =>
    request<Lead>(`/api/leads?id=${encodeURIComponent(leadId)}`, { method: "PATCH", body: { stage } }),
  leadsStale: (params?: { status?: string; stale_minutes?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status)        qs.set("status",        params.status);
    if (params?.stale_minutes) qs.set("stale_minutes", String(params.stale_minutes));
    if (params?.limit)         qs.set("limit",         String(params.limit));
    return request<any>(`/api/leads/stale?${qs.toString()}`);
  },
  markFollowup: (leadId: string, body: { followup_sent_at?: string; followup_text?: string }) =>
    request<any>(`/api/leads/${encodeURIComponent(leadId)}/followup`, { method: "PATCH", body }),

  messages:    (lead_id: string) => request<Message[]>(`/api/messages?lead_id=${encodeURIComponent(lead_id)}`),
  sendMessage: (lead_id: string, body: string) =>
    request<Message>("/api/messages", { method: "POST", body: { lead_id, body } }),
  updateMessageStatus: (body: { external_id: string; status: string; read_at?: string }) =>
    request<any>("/api/messages/status", { method: "PATCH", body }),

  instances:        () => request<any[]>("/api/instances"),
  registerInstance: (body: { instance_name: string; status?: string; qr_base64?: string | null; qr_code_url?: string | null; evo_instance_id?: string | null }) =>
    request<any>("/api/instances", { method: "POST", body }),

  inboundPing: () => request<any>("/api/inbound"),
};
