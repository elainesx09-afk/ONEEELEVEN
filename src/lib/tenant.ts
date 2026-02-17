// src/lib/tenant.ts
const LS_TOKEN = 'oneeleven_api_token';
const LS_WORKSPACE = 'oneeleven_workspace_id';

export function getTenant(): { token: string; workspaceId: string } {
  const token = (localStorage.getItem(LS_TOKEN) || '').trim();
  const workspaceId = (localStorage.getItem(LS_WORKSPACE) || '').trim();
  return { token, workspaceId };
}

export function setTenant(t: { token?: string; workspaceId?: string }) {
  if (typeof t.token === 'string') localStorage.setItem(LS_TOKEN, t.token);
  if (typeof t.workspaceId === 'string') localStorage.setItem(LS_WORKSPACE, t.workspaceId);
}
