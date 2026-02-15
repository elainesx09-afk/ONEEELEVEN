// src/lib/api.ts

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: string; debugId?: string; details?: any };
type ApiResp<T> = ApiOk<T> | ApiFail;

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5173";

const API_TOKEN = (import.meta as any).env?.VITE_API_TOKEN || "";
const WORKSPACE_ID = (import.meta as any).env?.VITE_WORKSPACE_ID || "";

function getHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    "x-api-token": API_TOKEN,
    "workspace_id": WORKSPACE_ID,
    ...(extra || {}),
  };
}

async function request<T>(
  path: string,
  opts?: { method?: string; body?: any; headers?: Record<string, string> }
): Promise<ApiResp<T>> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const method = opts?.method || "GET";

  try {
    const res = await fetch(url, {
      method,
      headers: getHeaders(opts?.headers),
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    // tenta ler JSON sempre
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    // nosso backend responde {ok:true,data} ou {ok:false,error}
    if (json && typeof json === "object" && "ok" in json) {
      return json as ApiResp<T>;
    }

    // fallback se veio algo estranho
    if (!res.ok) {
      return { ok: false, error: `HTTP_${res.status}`, details: json };
    }

    return { ok: true, data: (json as T) ?? (null as any) };
  } catch (e: any) {
    return { ok: false, error: "FETCH_FAILED", details: String(e?.message || e) };
  }
}

/** Tipos mínimos (mantém compat) */
export type Lead = {
  id: string;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  stage?: string | null;
  client_id?: string | null;
  workspace_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Message = {
  id: string;
  lead_id: string;
  direction: "in" | "out";
  body: string;
  created_at?: string | null;
};

export const api = {
  version: () => request<any>("/api/version"),

  whoami: () => request<any>("/api/whoami"),

  overview: () => request<any>("/api/overview"),

  leads: () => request<Lead[]>("/api/leads"),

  createLead: (payload: Partial<Lead>) =>
    request<Lead>("/api/leads", { method: "POST", body: payload }),

  updateLeadStage: (id: string, stage: string) =>
    request<Lead>(`/api/leads?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { stage },
    }),

  messages: (lead_id: string) =>
    request<Message[]>(`/api/messages?lead_id=${encodeURIComponent(lead_id)}`),

  sendMessage: (lead_id: string, body: string) =>
    request<Message>("/api/messages", { method: "POST", body: { lead_id, body } }),
};
