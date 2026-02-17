// src/lib/api.ts
import { getTenant } from '@/lib/tenant';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

// Fallback (build-time)
const FALLBACK_TOKEN = String((import.meta as any).env?.VITE_API_TOKEN || '');
const FALLBACK_WORKSPACE = String((import.meta as any).env?.VITE_WORKSPACE_ID || '');

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; debugId?: string; details?: any };

export type LeadStage =
  | 'Novo'
  | 'Em atendimento'
  | 'Qualificado'
  | 'Agendado'
  | 'Fechado'
  | 'Perdido';

export type Workspace = {
  id: string;
  name: string;
  createdAt?: string;
  [k: string]: any;
};

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
  direction: 'in' | 'out';
  created_at?: string | null;
  [k: string]: any;
};

function buildHeaders() {
  const t = getTenant();
  const token = t.token || FALLBACK_TOKEN;
  const workspaceId = t.workspaceId || FALLBACK_WORKSPACE;

  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['x-api-token'] = token;
  if (workspaceId) h['workspace_id'] = workspaceId;
  return h;
}

async function request<T>(
  path: string,
  opts?: { method?: string; body?: any }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts?.method || 'GET',
      headers: buildHeaders(),
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const json = await res.json().catch(() => null);

    if (json?.ok === true) return { ok: true, data: json.data as T };

    const errMsg = json?.error || (res.ok ? 'UNKNOWN_ERROR' : `HTTP_${res.status}`);

    return {
      ok: false,
      error: errMsg,
      debugId: json?.debugId,
      details: json?.details,
    };
  } catch (e: any) {
    return { ok: false, error: 'NETWORK_ERROR', details: String(e?.message || e) };
  }
}

export const api = {
  version: () => request<any>('/api/version'),
  health: () => request<any>('/api/health'),

  // 🔥 multi-tenant list (só precisa do token)
  workspaces: () => request<Workspace[]>('/api/workspaces'),

  overview: () => request<any>('/api/overview'),

  leads: () => request<Lead[]>('/api/leads'),

  createLead: (body: { name?: string; phone?: string; status?: string; stage?: string; tags?: any }) =>
    request<Lead>('/api/leads', { method: 'POST', body }),

  updateLeadStage: (leadId: string, stage: LeadStage) =>
    request<Lead>(`/api/leads?id=${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      body: { stage },
    }),

  messages: (lead_id: string) =>
    request<Message[]>(`/api/messages?lead_id=${encodeURIComponent(lead_id)}`),

  sendMessage: (lead_id: string, body: string) =>
    request<Message>('/api/messages', { method: 'POST', body: { lead_id, body } }),
};
