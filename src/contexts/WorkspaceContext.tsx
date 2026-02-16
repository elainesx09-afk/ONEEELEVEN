import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { isDemoMode } from '@/lib/demoMode';
import { api } from '@/lib/api';

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

const LS_WORKSPACE = 'oneeleven_workspace_id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const fallbackId = String((import.meta as any).env?.VITE_WORKSPACE_ID || 'workspace');

  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: fallbackId, name: 'One Eleven', niche: 'Workspace', timezone: 'America/Sao_Paulo', status: 'active' },
  ]);

  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace>(() => {
    const saved = localStorage.getItem(LS_WORKSPACE);
    const id = (saved && saved.trim()) ? saved : fallbackId;
    return { id, name: 'One Eleven', niche: 'Workspace', timezone: 'America/Sao_Paulo', status: 'active' };
  });

  // carrega workspaces reais (se não estiver em demo)
  useEffect(() => {
    if (isDemoMode) return;

    (async () => {
      const r = await api.workspaces();
      if (!r.ok) return;

      const list = (r.data ?? []).map((w: any) => ({
        id: String(w.id),
        name: String(w.name || 'Workspace'),
        niche: 'Workspace',
        timezone: 'America/Sao_Paulo',
        status: 'active',
        createdAt: w.created_at ? String(w.created_at) : undefined,
      })) as Workspace[];

      if (list.length === 0) return;

      setWorkspaces(list);

      // mantém selecionado se existir, senão pega o primeiro
      const saved = localStorage.getItem(LS_WORKSPACE);
      const pick = list.find(x => x.id === saved) || list[0];
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
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
}
