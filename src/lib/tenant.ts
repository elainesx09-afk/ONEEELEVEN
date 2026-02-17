// src/lib/tenant.ts
const LS_TOKEN = "oneeleven_api_token";
const LS_WORKSPACE = "oneeleven_workspace_id";

export type Tenant = {
  token: string;
  workspaceId: string;
};

export function getTenant(): Tenant {
  try {
    const token =
      (localStorage.getItem(LS_TOKEN) || "").trim() ||
      String((import.meta as any).env?.VITE_API_TOKEN || "").trim() ||
      "";

    const workspaceId =
      (localStorage.getItem(LS_WORKSPACE) || "").trim() ||
      String((import.meta as any).env?.VITE_WORKSPACE_ID || "").trim() ||
      "";

    return { token, workspaceId };
  } catch {
    // se localStorage falhar por qualquer motivo, cai no env
    return {
      token: String((import.meta as any).env?.VITE_API_TOKEN || "").trim(),
      workspaceId: String((import.meta as any).env?.VITE_WORKSPACE_ID || "").trim(),
    };
  }
}

export function setTenant(partial: Partial<Tenant>) {
  try {
    if (typeof partial.token === "string") {
      localStorage.setItem(LS_TOKEN, partial.token);
    }
    if (typeof partial.workspaceId === "string") {
      localStorage.setItem(LS_WORKSPACE, partial.workspaceId);
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
