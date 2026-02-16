import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from 'react';
import { Workspace, demoWorkspaces } from '@/data/demoData';
import { isDemoMode } from '@/lib/demoMode';

interface WorkspaceContextType {
  currentWorkspace: Workspace;
  setCurrentWorkspace: (workspace: Workspace) => void;
  workspaces: Workspace[];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

async function fetchWorkspaces(): Promise<Workspace[]> {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const token = String(import.meta.env.VITE_API_TOKEN || '');
  const wid = String(import.meta.env.VITE_WORKSPACE_ID || '');

  if (!base) throw new Error('VITE_API_BASE_URL ausente');
  if (!token) throw new Error('VITE_API_TOKEN ausente');
  if (!wid) throw new Error('VITE_WORKSPACE_ID ausente');

  const r = await fetch(`${base}/api/workspaces`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': token,
      'workspace_id': wid,
    },
  });

  const json = await r.json().catch(() => null);
  if (!r.ok || !json?.ok) {
    throw new Error(json?.error || `HTTP_${r.status}`);
  }

  const arr = Array.isArray(json.data) ? json.data : [];
  return arr.map((w: any) => ({
    id: String(w.id),
    name: w.name ?? 'Workspace',
    niche: w.niche ?? 'Workspace',
    timezone: w.timezone ?? 'America/Sao_Paulo',
    status: w.status ?? 'active',
    instances: Number(w.instances ?? 0),
    leads: Number(w.leads ?? 0),
    conversions: Number(w.conversions ?? 0),
    lastActivity: w.lastActivity ?? '—',
    createdAt: w.createdAt ?? new Date().toISOString(),
  }));
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // fallback seguro (não quebra UI)
  const fallbackWorkspace: Workspace = useMemo(() => {
    const id = String(import.meta.env.VITE_WORKSPACE_ID || 'workspace');
    return {
      id,
      name: 'One Eleven',
      niche: 'Workspace',
      timezone: 'America/Sao_Paulo',
      status: 'active',
      instances: 0,
      leads: 0,
      conversions: 0,
      lastActivity: '—',
      createdAt: new Date().toISOString(),
    };
  }, []);

  const [workspaces, setWorkspaces] = useState<Workspace[]>(isDemoMode ? demoWorkspaces : [fallbackWorkspace]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(isDemoMode ? demoWorkspaces[0] : fallbackWorkspace);

  useEffect(() => {
    if (isDemoMode) return;

    let alive = true;
    fetchWorkspaces()
      .then((ws) => {
        if (!alive) return;
        if (ws.length > 0) {
          setWorkspaces(ws);
          setCurrentWorkspace(ws[0]);
        }
      })
      .catch(() => {
        // se falhar, mantém fallbackWorkspace (sem tela preta)
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, setCurrentWorkspace, workspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
