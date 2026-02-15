import { useMemo, useState } from 'react';
import { Search, MoreHorizontal, Phone, Clock, Plus } from 'lucide-react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Lead = {
  id: string;
  name?: string | null;
  phone?: string | null;
  stage?: string | null;
  status?: string | null;
  source?: string | null;
  score?: number | null;
  last_message?: string | null;
  last_message_at?: string | null;
  responsible?: string | null;
};

type StageKey = 'novo' | 'qualificando' | 'proposta' | 'follow-up' | 'ganhou' | 'perdido';

const stageColors: Record<StageKey, string> = {
  novo: 'bg-info/10 text-info border-info/30',
  qualificando: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  proposta: 'bg-warning/10 text-warning border-warning/30',
  'follow-up': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  ganhou: 'bg-success/10 text-success border-success/30',
  perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

const stageLabels: Record<StageKey, string> = {
  novo: 'Novo',
  qualificando: 'Qualificando',
  proposta: 'Proposta',
  'follow-up': 'Follow-up',
  ganhou: 'Ganhou',
  perdido: 'Perdido',
};

function toStageKey(stage?: string | null): StageKey {
  const s = String(stage || '').trim().toLowerCase();
  if (s === 'novo') return 'novo';
  if (s === 'qualificado' || s.includes('qualific')) return 'qualificando';
  if (s === 'agendado' || s === 'proposta') return 'proposta';
  if (s === 'fechado' || s === 'ganhou') return 'ganhou';
  if (s === 'perdido') return 'perdido';
  if (s.includes('follow')) return 'follow-up';
  return 'novo';
}

function initials(name: string) {
  return (name || 'Lead')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'L';
}

// ✅ formata erro pra aparecer na UI (sem console)
function formatApiError(e: any): string {
  if (!e) return 'UNKNOWN_ERROR';

  // quando é throw new Error("...")
  if (typeof e?.message === 'string') return e.message;

  // quando veio objeto
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [saveError, setSaveError] = useState<string>('');

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const r = await api.leads();

      // ✅ MOSTRA o erro real
      if (!r.ok) {
        const dbg = (r as any)?.debugId ? ` debugId=${(r as any).debugId}` : '';
        const det = (r as any)?.details ? ` details=${JSON.stringify((r as any).details)}` : '';
        throw new Error(`${r.error}${dbg}${det}`);
      }

      return (r.data ?? []) as Lead[];
    },
    staleTime: 3_000,
    retry: 0,
  });

  const createLead = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const r = await api.createLead({ name, phone, stage: 'Novo' } as any);

      // ✅ MOSTRA o erro real
      if (!r.ok) {
        const dbg = (r as any)?.debugId ? ` debugId=${(r as any).debugId}` : '';
        const det = (r as any)?.details ? ` details=${JSON.stringify((r as any).details)}` : '';
        throw new Error(`${r.error}${dbg}${det}`);
      }

      return r.data;
    },
    onMutate: () => setSaveError(''),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leads'] });
      await qc.invalidateQueries({ queryKey: ['overview'] });

      setShowAdd(false);
      setNewName('');
      setNewPhone('');
    },
    onError: (e: any) => setSaveError(formatApiError(e)),
  });

  const allLeads = (leadsQuery.data ?? []) as Lead[];

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLeads.filter((lead) => {
      const name = String(lead.name ?? '').toLowerCase();
      const phone = String(lead.phone ?? '');
      const matchesSearch = !q || name.includes(q) || phone.includes(q);

      const key = toStageKey(lead.stage ?? lead.status ?? 'Novo');
      const matchesStage = stageFilter === 'all' || key === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [allLeads, searchQuery, stageFilter]);

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]);
    else setSelectedLeads(filteredLeads.map((l) => l.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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
      render: (item: Lead) => (
        <Checkbox checked={selectedLeads.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
      ),
    },
    {
      key: 'name',
      header: 'Lead',
      render: (item: Lead) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{initials(String(item.name || 'Lead'))}</span>
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name || '—'}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {item.phone || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (item: Lead) => {
        const k = toStageKey(item.stage ?? item.status ?? 'Novo');
        return (
          <Badge variant="outline" className={cn('border', stageColors[k])}>
            {stageLabels[k]}
          </Badge>
        );
      },
    },
    {
      key: 'source',
      header: 'Source',
      render: (item: Lead) => <span className="text-muted-foreground text-sm">{item.source || '-'}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      render: (item: Lead) => {
        const score = Number(item.score ?? 0);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  score >= 80 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-destructive'
                )}
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground">{score}</span>
          </div>
        );
      },
    },
    {
      key: 'lastMessage',
      header: 'Last Message',
      render: (item: Lead) => (
        <div className="max-w-[200px]">
          <p className="text-sm text-foreground truncate">{item.last_message || '—'}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {item.last_message_at ? new Date(item.last_message_at).toLocaleString() : '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'responsible',
      header: 'Responsible',
      render: (item: Lead) => <span className="text-sm text-muted-foreground">{item.responsible || '-'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: () => (
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
          <p className="text-muted-foreground mt-1">{filteredLeads.length} leads encontrados</p>
        </div>

        <Button onClick={() => setShowAdd((v) => !v)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </div>

      {showAdd && (
        <div className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Name"
              className="bg-secondary border-border max-w-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Phone"
              className="bg-secondary border-border max-w-sm"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Button
              onClick={() => {
                const name = newName.trim();
                const phone = newPhone.trim();
                if (!name || !phone) {
                  setSaveError('Preencha nome e telefone.');
                  return;
                }
                createLead.mutate({ name, phone });
              }}
              disabled={createLead.isPending}
            >
              {createLead.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              className="border-border text-muted-foreground"
              onClick={() => {
                setShowAdd(false);
                setSaveError('');
              }}
            >
              Cancel
            </Button>

            <div className="text-xs text-muted-foreground ml-auto">
              Workspace: <span className="text-foreground">{currentWorkspace?.name}</span>
            </div>
          </div>

          {/* ✅ erro de SAVE */}
          {saveError && <div className="text-xs text-destructive break-all">{saveError}</div>}
        </div>
      )}

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
      </div>

      <DataTable columns={columns} data={filteredLeads} keyField="id" />

      {/* ✅ erro de LOAD (mostra motivo real) */}
      {leadsQuery.isError && (
        <div className="text-xs text-destructive break-all">
          {formatApiError(leadsQuery.error)}
        </div>
      )}
    </div>
  );
}
