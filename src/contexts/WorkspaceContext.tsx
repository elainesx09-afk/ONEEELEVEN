// src/contexts/WorkspaceContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { isDemoMode } from "@/lib/demoMode";
import { api } from "@/lib/api";
import { ensureTenantInitialized, setTenant } from "@/lib/tenant";

export type Workspace = {
  id: string;
  name: string;
  niche?: string;
  timezone?: string;
  status?: string;
  createdAt?: string;
};

interface WorkspaceContextType {
  currentWorkspace: Workspace;
  setCurrentWorkspace: (workspace: Workspace) => void;
  workspaces: Workspace[];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const LS_WORKSPACE = "oneeleven_workspace_id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // garante token + workspace default no runtime
  useEffect(() => {
    ensureTenantInitialized();
  }, []);

  const fallbackId = String((import.meta as any).env?.VITE_WORKSPACE_ID || "workspace").trim();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: fallbackId, name: "One Eleven", niche: "Workspace", timezone: "America/Sao_Paulo", status: "active" },
  ]);

  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace>(() => {
    const saved = localStorage.getItem(LS_WORKSPACE);
    const id = (saved && saved.trim()) ? saved.trim() : fallbackId;

    // grava no tenant runtime também (pra garantir header)
    setTenant({ workspaceId: id });

    return { id, name: "One Eleven", niche: "Workspace", timezone: "America/Sao_Paulo", status: "active" };
  });

  useEffect(() => {
    if (isDemoMode) return;

    (async () => {
      // Se você ainda não tem /api/workspaces, isso só falha silencioso e mantém 1 workspace
      const r = await (api as any).workspaces?.();
      if (!r || !r.ok) return;

      const list = (r.data ?? []).map((w: any) => ({
        id: String(w.id),
        name: String(w.name || "Workspace"),
        niche: "Workspace",
        timezone: "America/Sao_Paulo",
        status: "active",
        createdAt: w.created_at ? String(w.created_at) : undefined,
      })) as Workspace[];

      if (list.length === 0) return;

      setWorkspaces(list);

      const saved = localStorage.getItem(LS_WORKSPACE);
      const pick = list.find((x) => x.id === saved) || list[0];

      setTenant({ workspaceId: pick.id });
      setCurrentWorkspaceState(pick);
    })();
  }, []);

  const setCurrentWorkspace = (w: Workspace) => {
    localStorage.setItem(LS_WORKSPACE, w.id);
    setTenant({ workspaceId: w.id });
    setCurrentWorkspaceState(w);

    // reload simples = sem risco, garante queries e headers corretos
    window.location.reload();
  };

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, setCurrentWorkspace, workspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return context;
}
