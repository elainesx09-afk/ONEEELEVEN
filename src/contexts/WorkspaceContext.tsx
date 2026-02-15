import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { Workspace, demoWorkspaces } from '@/data/demoData';
import { isDemoMode } from '@/lib/demoMode';

interface WorkspaceContextType {
  currentWorkspace: Workspace;
  setCurrentWorkspace: (workspace: Workspace) => void;
  workspaces: Workspace[];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const realWorkspace: Workspace = useMemo(() => {
    const id = String((import.meta as any).env?.VITE_WORKSPACE_ID || 'workspace');
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

  const available = isDemoMode ? demoWorkspaces : [realWorkspace];
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(available[0]);

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, setCurrentWorkspace, workspaces: available }}>
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
