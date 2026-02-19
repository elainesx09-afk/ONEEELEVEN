// src/lib/tenant.ts
const LS_TOKEN = 'oneeleven_api_token';
const LS_WORKSPACE = 'oneeleven_workspace_id';

export function getTenant() {
  const token = (localStorage.getItem(LS_TOKEN) || '').trim();
  const workspaceId = (localStorage.getItem(LS_WORKSPACE) || '').trim();
  return { token, workspaceId };
}

export function setTenant(input: { token?: string; workspaceId?: string }) {
  if (typeof input.token === 'string') {
    localStorage.setItem(LS_TOKEN, input.token.trim());
  }
  if (typeof input.workspaceId === 'string') {
    localStorage.setItem(LS_WORKSPACE, input.workspaceId.trim());
  }
}

export function ensureTenantFromEnv() {
  const envToken = String((import.meta as any).env?.VITE_API_TOKEN || '').trim();
  const envWorkspace = String((import.meta as any).env?.VITE_WORKSPACE_ID || '').trim();

  const cur = getTenant();
  if (!cur.token && envToken) localStorage.setItem(LS_TOKEN, envToken);
  if (!cur.workspaceId && envWorkspace) localStorage.setItem(LS_WORKSPACE, envWorkspace);

  return getTenant();
}
