// src/contexts/WorkspaceContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isDemoMode } from '@/lib/demoMode';
import { api } from '@/lib/api';
import { ensureTenantFromEnv } from '@/lib/tenant';

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
  // garante que token/workspace do ENV sejam salvos no localStorage
  const seeded = ensureTenantFromEnv();
  const fallbackId = seeded.workspaceId || String((import.meta as any).env?.VITE_WORKSPACE_ID || 'workspace');

  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: fallbackId, name: 'One Eleven', niche: 'Workspace', timezone: 'America/Sao_Paulo', status: 'active' },
  ]);

  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace>(() => {
    const saved = (localStorage.getItem(LS_WORKSPACE) || '').trim();
    const id = saved || fallbackId;
    return { id, name: 'One Eleven', niche: 'Workspace', timezone: 'America/Sao_Paulo', status: 'active' };
  });

  useEffect(() => {
    if (isDemoMode) return;

    (async () => {
      const r = await api.workspaces?.();
      if (!r || !r.ok) return;

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

      const saved = (localStorage.getItem(LS_WORKSPACE) || '').trim();
      const pick = list.find(x => x.id === saved) || list[0];
      localStorage.setItem(LS_WORKSPACE, pick.id);
      setCurrentWorkspaceState(pick);
    })();
  }, []);

  const setCurrentWorkspace = (w: Workspace) => {
    localStorage.setItem(LS_WORKSPACE, w.id);
    setCurrentWorkspaceState(w);
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
