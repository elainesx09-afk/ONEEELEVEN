// src/contexts/WorkspaceContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { isDemoMode } from "@/lib/demoMode";
import { api } from "@/lib/api";

export type Workspace = {
  id: string;
  name: string;
  niche?: string;
  timezone?: string;
  status?: string;
  instances?: number;
  leads?: number;
  conversions?: number;
  lastActivity?: string;
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
  const fallbackId = String((import.meta as any).env?.VITE_WORKSPACE_ID || "workspace");

  const fallbackWorkspace: Workspace = {
    id: fallbackId,
    name: "One Eleven",
    niche: "Workspace",
    timezone: "America/Sao_Paulo",
    status: "active",
  };

  const [workspaces, setWorkspaces] = useState<Workspace[]>([fallbackWorkspace]);

  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace>(() => {
    const saved = localStorage.getItem(LS_WORKSPACE);
    const id = saved && saved.trim() ? saved : fallbackId;
    return { ...fallbackWorkspace, id };
  });

  // carrega workspaces reais via /api/version (sem criar endpoint novo)
  useEffect(() => {
    if (isDemoMode) return;

    (async () => {
      const r = await api.version();
      if (!r.ok) return;

      const listRaw = (r.data?.workspaces ?? []) as any[];
      if (!Array.isArray(listRaw) || listRaw.length === 0) return;

      const list: Workspace[] = listRaw.map((w: any) => ({
        id: String(w.id),
        name: String(w.name || "Workspace"),
        niche: "Workspace",
        timezone: "America/Sao_Paulo",
        status: "active",
        createdAt: w.created_at ? String(w.created_at) : undefined,
      }));

      setWorkspaces(list);

      // mantém selecionado se existir, senão pega o primeiro
      const saved = (localStorage.getItem(LS_WORKSPACE) || "").trim();
      const pick = list.find((x) => x.id === saved) || list[0];
      setCurrentWorkspaceState(pick);
    })();
  }, []);

  const setCurrentWorkspace = (w: Workspace) => {
    localStorage.setItem(LS_WORKSPACE, w.id);
    setCurrentWorkspaceState(w);
    // reload simples: garante que headers + queries reflitam o novo workspace
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
