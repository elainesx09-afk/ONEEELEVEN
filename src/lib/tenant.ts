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

/**
 * Lê 'token' e 'workspace' da URL e salva no localStorage.
 * Útil para permitir acesso direto via link com credenciais.
 * 
 * Exemplo: https://app.com/?token=sk-live-abc&workspace=ws_123
 */
export function applyTenantFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const workspaceFromUrl = params.get("workspace");

    if (tokenFromUrl || workspaceFromUrl) {
      setTenant({
        token: tokenFromUrl || undefined,
        workspaceId: workspaceFromUrl || undefined,
      });

      // Remove os parâmetros da URL para não expor credenciais
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("token");
      newUrl.searchParams.delete("workspace");
      window.history.replaceState({}, "", newUrl.toString());

      console.log("[Tenant] Credenciais carregadas da URL e salvas no localStorage");
    }
  } catch (error) {
    console.error("[Tenant] Erro ao ler credenciais da URL:", error);
  }
}
