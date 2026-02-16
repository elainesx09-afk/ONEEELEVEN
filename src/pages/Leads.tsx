import { useMemo, useState } from 'react';
import { Search, MoreHorizontal, Phone, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isDemoMode } from '@/lib/demoMode';
import { useQuery } from '@tanstack/react-query';

/**
 * UI Lead shape (compatível com seu DataTable atual)
 */
type UIStage =
  | 'novo'
  | 'qualificando'
  | 'proposta'
  | 'follow-up'
  | 'ganhou'
  | 'perdido';

type LeadUI = {
  id: string;
  name: string;
  phone: string;
  stage: UIStage;
  source?: string | null;
  score?: number | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  responsible?: string | null;
  // campos extras vindos do banco (não atrapalham)
  status?: string | null;
  created_at?: string | null;
};

const stageColors: Record<UIStage, string> = {
  novo: 'bg-info/10 text-info border-info/30',
  qualificando: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  proposta: 'bg-warning/10 text-warning border-warning/30',
  'follow-up': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  ganhou: 'bg-success/10 text-success border-success/30',
  perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

const stageLabels: Record<UIStage, string> = {
  novo: 'Novo',
  qualificando: 'Qualificando',
  proposta: 'Proposta',
  'follow-up': 'Follow-up',
  ganhou: 'Ganhou',
  perdido: 'Perdido',
};

// status do banco (PT-BR) -> stage do UI
function statusToStage(statusRaw: any): UIStage {
  const s = String(statusRaw || '').trim().toLowerCase();

  // PT-BR que você já está usando no banco
  if (s === 'novo') return 'novo';
  if (s === 'qualificando') return 'qualificando';
  if (s === 'qualificado') return 'qualificando';
  if (s === 'proposta') return 'proposta';
  if (s === 'follow-up' || s === 'follow up' || s === 'followup') return 'follow-up';
  if (s === 'agendado') return 'follow-up';       // UI não tem “Agendado” -> joga no follow-up
  if (s === 'fechado') return 'ganhou';           // UI não tem “Fechado” -> ganhou
  if (s === 'ganhou') return 'ganhou';
  if (s === 'perdido') return 'perdido';

  // fallback seguro
  return 'novo';
}

async function apiGetLeads(workspaceId: string): Promise<LeadUI[]> {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const token = String(import.meta.env.VITE_API_TOKEN || '');

  if (!base) throw new Error('VITE_API_BASE_URL ausente');
  if (!token) throw new Error('VITE_API_TOKEN ausente');
  if (!workspaceId) throw new Error('workspaceId ausente');

  const r = await fetch(`${base}/api/leads`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': token,
      'workspace_id': workspaceId,
    },
  });

  const json = await r.json().catch(() => null);

  if (!r.ok || !json?.ok) {
    const msg = json?.error || `HTTP_${r.status}`;
    throw new Error(msg);
  }

  const rows = Array.isArray(json.data) ? json.data : [];

  // Converte para o modelo do UI sem inventar “dados fake”
  return rows.map((l: any) => {
    const name = String(l?.name || '').trim() || 'Sem nome';
    const phone = String(l?.phone || '').trim() || '-';
    const status = l?.status ?? l?.stage ?? 'Novo';

    const out: LeadUI = {
      id: String(l?.id),
      name,
      phone,
      stage: statusToStage(status),
      status: String(status || ''),
      created_at: l?.created_at ?? null,

      // campos que o layout mostra mas o banco não tem (mantém neutro, não fake)
      source: l?.source ?? null,
      score: l?.score ?? null,
      lastMessage: l?.lastMessage ?? null,
      lastMessageAt: l?.lastMessageAt ?? null,
      responsible: l?.responsible ?? null,
    };

    return out;
  });
}

export default function Leads() {
  const { currentWorkspace } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const {
    data: allLeads = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', currentWorkspace?.id],
    queryFn: async () => {
      // Se demo mode estiver ligado explicitamente, não chama API
      if (isDemoMode) return [];
      return apiGetLeads(String(currentWorkspace?.id || ''));
    },
    enabled: Boolean(currentWorkspace?.id),
    staleTime: 10_000,
    retry: 1,
  });

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(lead.phone || '').includes(searchQuery);
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [allLeads, searchQuery, stageFilter]);

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      ) as any,
      className: 'w-12',
      render: (item: LeadUI) => (
        <Checkbox
          checked={selectedLeads.includes(item.id)}
          onCheckedChange={() => toggleSelect(item.id)}
        />
      ),
    },
    {
      key: 'name',
      header: 'Lead',
      render: (item: LeadUI) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {item.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {item.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (item: LeadUI) => (
        <Badge variant="outline" className={cn('border', stageColors[item.stage])}>
          {stageLabels[item.stage]}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (item: LeadUI) => (
        <span className="text-muted-foreground text-sm">{item.source || '-'}</span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (item: LeadUI) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                (item.score ?? 0) >= 80 ? 'bg-success' : (item.score ?? 0) >= 50 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${Math.max(0, Math.min(100, Number(item.score ?? 0)))}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground">{Number(item.score ?? 0)}</span>
        </div>
      ),
    },
    {
      key: 'lastMessage',
      header: 'Last Message',
      render: (item: LeadUI) => (
        <div className="max-w-[200px]">
          <p className="text-sm text-foreground truncate">{item.lastMessage || '-'}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {item.lastMessageAt || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'responsible',
      header: 'Responsible',
      render: (item: LeadUI) => (
        <span className="text-sm text-muted-foreground">{item.responsible || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: LeadUI) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Start Follow-up</DropdownMenuItem>
            <DropdownMenuItem>Move to Pipeline</DropdownMenuItem>
            <DropdownMenuItem>Assign to</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Carregando...' : `${filteredLeads.length} leads encontrados`}
          </p>

          {isError && (
            <div className="mt-2 text-sm text-destructive">
              Falhou ao carregar leads: {String((error as any)?.message || 'erro')}
              <button className="ml-2 underline" onClick={() => refetch()}>
                tentar novamente
              </button>
            </div>
          )}

          {isDemoMode && (
            <div className="mt-2 text-sm text-warning">
              DEMO MODE está ligado via VITE_DEMO_MODE=true
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="qualificando">Qualificando</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
            <SelectItem value="ganhou">Ganhou</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>

        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selectedLeads.length} selected</span>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              Start Follow-up
            </Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              Move Stage
            </Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              Assign
            </Button>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={filteredLeads} keyField="id" />
    </div>
  );
}
