// src/lib/tenant.ts
type Tenant = { token: string; workspaceId: string };

const LS_TOKEN = "oneeleven_api_token";
const LS_WORKSPACE = "oneeleven_workspace_id";

function envStr(key: string) {
  return String((import.meta as any).env?.[key] || "").trim();
}

export function getTenant(): Tenant {
  const tokenLS = String(localStorage.getItem(LS_TOKEN) || "").trim();
  const wsLS = String(localStorage.getItem(LS_WORKSPACE) || "").trim();

  const tokenEnv = envStr("VITE_API_TOKEN");
  const wsEnv = envStr("VITE_WORKSPACE_ID");

  return {
    token: tokenLS || tokenEnv,
    workspaceId: wsLS || wsEnv,
  };
}

/**
 * Garante que o tenant exista no runtime.
 * Regra:
 * - Se localStorage estiver vazio, popula com VITE_*.
 * - Não sobrescreve se o user já trocou o workspace.
 */
export function ensureTenantInitialized() {
  const tokenLS = String(localStorage.getItem(LS_TOKEN) || "").trim();
  const wsLS = String(localStorage.getItem(LS_WORKSPACE) || "").trim();

  const tokenEnv = envStr("VITE_API_TOKEN");
  const wsEnv = envStr("VITE_WORKSPACE_ID");

  if (!tokenLS && tokenEnv) localStorage.setItem(LS_TOKEN, tokenEnv);
  if (!wsLS && wsEnv) localStorage.setItem(LS_WORKSPACE, wsEnv);
}

export function setTenant(next: Partial<Tenant>) {
  if (typeof next.token === "string") {
    localStorage.setItem(LS_TOKEN, next.token.trim());
  }
  if (typeof next.workspaceId === "string") {
    localStorage.setItem(LS_WORKSPACE, next.workspaceId.trim());
  }
}

export function clearTenant() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_WORKSPACE);
}
