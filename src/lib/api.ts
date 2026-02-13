export type Lead = {
  id: string;
  name?: string | null;
  phone?: string | null;
  stage?: string | null;
  created_at?: string;
  [k: string]: any;
};

export type Message = {
  id: string;
  lead_id: string;
  direction?: 'in' | 'out' | string;
  text?: string | null;
  created_at?: string;
  [k: string]: any;
};

function apiBase() {
  const b = import.meta.env.VITE_API_BASE_URL;
  return b ? String(b).replace(/\/$/, '') : '';
}

function headers() {
  const token = import.meta.env.VITE_API_TOKEN;
  const workspaceId = import.meta.env.VITE_WORKSPACE_ID;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['x-api-token'] = String(token);
  if (workspaceId) h['workspace_id'] = String(workspaceId);
  return h;
}

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${apiBase()}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...headers(), ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function fetchOverview() {
  return http<{ ok: true; totals: { leads: number; messages: number }; stageCounts: Record<string, number> }>('/api/overview');
}

export async function fetchLeads() {
  const r = await http<{ ok: true; leads: Lead[] }>('/api/leads');
  return r.leads;
}

export async function updateLeadStage(leadId: string, stage: string) {
  const r = await http<{ ok: true; lead: Lead }>('/api/leads', {
    method: 'PATCH',
    body: JSON.stringify({ lead_id: leadId, stage }),
  });
  return r.lead;
}

export async function fetchMessages(leadId: string) {
  const r = await http<{ ok: true; messages: Message[] }>(`/api/messages?lead_id=${encodeURIComponent(leadId)}`);
  return r.messages;
}

export async function sendMessage(leadId: string, text: string) {
  const r = await http<{ ok: true; message: Message }>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ lead_id: leadId, text }),
  });
  return r.message;
}
