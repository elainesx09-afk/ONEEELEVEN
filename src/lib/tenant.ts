// src/lib/tenant.ts
const LS_TOKEN = "oneeleven_api_token";
const LS_WORKSPACE = "oneeleven_workspace_id";

export type Tenant = {
  token: string;
  workspaceId: string;
};

function clean(v: any) {
  return String(v ?? "").trim();
}

/**
 * Permite setar tenant via URL sem criar tela:
 * ?token=...&workspace=...
 * Aceita também: workspace_id, wid
 */
export function applyTenantFromUrl(): boolean {
  try {
    const url = new URL(window.location.href);
    const sp = url.searchParams;

    const token =
      clean(sp.get("token")) ||
      clean(sp.get("x-api-token")) ||
      "";

    const workspaceId =
      clean(sp.get("workspace")) ||
      clean(sp.get("workspace_id")) ||
      clean(sp.get("wid")) ||
      "";

    const hasAny = !!(token || workspaceId);
    if (!hasAny) return false;

    if (token) localStorage.setItem(LS_TOKEN, token);
    if (workspaceId) localStorage.setItem(LS_WORKSPACE, workspaceId);

    // remove parâmetros sensíveis da URL
    sp.delete("token");
    sp.delete("x-api-token");
    sp.delete("workspace");
    sp.delete("workspace_id");
    sp.delete("wid");

    const newUrl =
      url.pathname + (sp.toString() ? `?${sp.toString()}` : "") + url.hash;

    window.history.replaceState({}, "", newUrl);
    return true;
  } catch {
    return false;
  }
}

export function getTenant(): Tenant {
  try {
    const token =
      clean(localStorage.getItem(LS_TOKEN)) ||
      clean((import.meta as any).env?.VITE_API_TOKEN) ||
      "";

    const workspaceId =
      clean(localStorage.getItem(LS_WORKSPACE)) ||
      clean((import.meta as any).env?.VITE_WORKSPACE_ID) ||
      "";

    return { token, workspaceId };
  } catch {
    return {
      token: clean((import.meta as any).env?.VITE_API_TOKEN),
      workspaceId: clean((import.meta as any).env?.VITE_WORKSPACE_ID),
    };
  }
}

export function setTenant(partial: Partial<Tenant>) {
  try {
    if (typeof partial.token === "string") {
      localStorage.setItem(LS_TOKEN, clean(partial.token));
    }
    if (typeof partial.workspaceId === "string") {
      localStorage.setItem(LS_WORKSPACE, clean(partial.workspaceId));
    }
  } catch {
    // ignora
  }
}

export function clearTenant() {
  try {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_WORKSPACE);
  } catch {
    // ignora
  }
}
