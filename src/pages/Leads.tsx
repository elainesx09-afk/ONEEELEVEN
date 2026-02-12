import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Phone, Mail, Star, Clock, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getLeadsByWorkspace, Lead } from '@/data/demoData';
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

const stageColors: Record<Lead['stage'], string> = {
  novo: 'bg-info/10 text-info border-info/30',
  qualificando: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  proposta: 'bg-warning/10 text-warning border-warning/30',
  'follow-up': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  ganhou: 'bg-success/10 text-success border-success/30',
  perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

const stageLabels: Record<Lead['stage'], string> = {
  novo: 'Novo',
  qualificando: 'Qualificando',
  proposta: 'Proposta',
  'follow-up': 'Follow-up',
  ganhou: 'Ganhou',
  perdido: 'Perdido',
};

export default function Leads() {
  const { currentWorkspace } = useWorkspace();
  const allLeads = getLeadsByWorkspace(currentWorkspace.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const filteredLeads = allLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

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
      render: (item: Lead) => (
        <Checkbox
          checked={selectedLeads.includes(item.id)}
          onCheckedChange={() => toggleSelect(item.id)}
        />
      ),
    },
    {
      key: 'name',
      header: 'Lead',
      render: (item: Lead) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {item.name.split(' ').map((n) => n[0]).join('')}
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
      render: (item: Lead) => (
        <Badge variant="outline" className={cn('border', stageColors[item.stage])}>
          {stageLabels[item.stage]}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (item: Lead) => <span className="text-muted-foreground text-sm">{item.source}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      render: (item: Lead) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                item.score >= 80 ? 'bg-success' : item.score >= 50 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${item.score}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground">{item.score}</span>
        </div>
      ),
    },
    {
      key: 'lastMessage',
      header: 'Last Message',
      render: (item: Lead) => (
        <div className="max-w-[200px]">
          <p className="text-sm text-foreground truncate">{item.lastMessage}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {item.lastMessageAt}
          </div>
        </div>
      ),
    },
    {
      key: 'responsible',
      header: 'Responsible',
      render: (item: Lead) => (
        <span className="text-sm text-muted-foreground">{item.responsible || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: Lead) => (
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {filteredLeads.length} leads encontrados
          </p>
        </div>
      </div>

      {/* Filters */}
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

        {/* Bulk Actions */}
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

      {/* Table */}
      <DataTable columns={columns} data={filteredLeads} keyField="id" />
    </div>
  );
}
