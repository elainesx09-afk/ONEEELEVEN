// src/lib/tenant.ts
// Troca de tenant (workspace_id + x-api-token) em runtime, sem rebuild.
// Uso: /overview?workspace_id=UUID&x_api_token=TOKEN

const LS_WORKSPACE = 'oneeleven_workspace_id';
const LS_TOKEN = 'oneeleven_api_token';

export type Tenant = {
  workspaceId: string | null;
  token: string | null;
};

export function getTenant(): Tenant {
  const workspaceId = localStorage.getItem(LS_WORKSPACE);
  const token = localStorage.getItem(LS_TOKEN);
  return {
    workspaceId: workspaceId && workspaceId.trim() ? workspaceId : null,
    token: token && token.trim() ? token : null,
  };
}

export function setTenant(next: Tenant) {
  if (next.workspaceId) localStorage.setItem(LS_WORKSPACE, next.workspaceId);
  if (next.token) localStorage.setItem(LS_TOKEN, next.token);
}

export function clearTenant() {
  localStorage.removeItem(LS_WORKSPACE);
  localStorage.removeItem(LS_TOKEN);
}

function removeParamsFromUrl(keys: string[]) {
  try {
    const url = new URL(window.location.href);
    keys.forEach((k) => url.searchParams.delete(k));
    // remove "?" vazio
    const clean =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') +
      url.hash;
    window.history.replaceState({}, '', clean);
  } catch {
    // ignore
  }
}

/**
 * Se houver workspace_id e x_api_token na URL:
 * - salva no localStorage
 * - remove da URL
 * - retorna true (para você dar reload/refetch)
 */
export function applyTenantFromUrl(): boolean {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  const workspaceId = url.searchParams.get('workspace_id');
  const token = url.searchParams.get('x_api_token');

  if (!workspaceId || !token) return false;

  setTenant({ workspaceId, token });
  removeParamsFromUrl(['workspace_id', 'x_api_token']);
  return true;
}
