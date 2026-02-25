// src/pages/Clients.tsx — Real data via TanStack Query, zero demoData
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, MoreHorizontal, Users, Smartphone, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api, ClientData } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatLastActivity(ts?: string | null) {
  if (!ts) return '—';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ptBR });
  } catch {
    return ts;
  }
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function Clients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const result = await api.clients();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const clients: ClientData[] = data?.clients ?? [];

  const totalLeads       = clients.reduce((acc, c) => acc + (c.leads_count ?? 0), 0);
  const totalConversions = clients.reduce((acc, c) => acc + (c.conversions_count ?? 0), 0);

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (item: ClientData) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{item.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ClientData) => (
        <StatusBadge
          status={item.status === 'active' ? 'connected' : 'disconnected'}
          label={item.status}
        />
      ),
    },
    {
      key: 'instances_count',
      header: 'Instances',
      render: (item: ClientData) => (
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.instances_count ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'leads_count',
      header: 'Leads',
      render: (item: ClientData) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.leads_count ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'conversions_count',
      header: 'Conversions',
      render: (item: ClientData) => (
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <span className="text-foreground font-medium">{item.conversions_count ?? 0}</span>
          {(item.leads_count ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground">({item.conversion_rate}%)</span>
          )}
        </div>
      ),
    },
    {
      key: 'last_activity',
      header: 'Last Activity',
      render: (item: ClientData) => (
        <span className="text-muted-foreground text-sm">
          {formatLastActivity(item.last_activity)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: () => (
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your agency's client workspaces</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-muted-foreground" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-premium">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Workspace</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Add a new client workspace to your agency
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Company Name</Label>
                  <Input placeholder="e.g., Fashion Brand Co." className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Niche / Industry</Label>
                  <Select>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="fashion">Moda & Vestuário</SelectItem>
                      <SelectItem value="health">Saúde & Estética</SelectItem>
                      <SelectItem value="tech">Tecnologia</SelectItem>
                      <SelectItem value="food">Alimentação</SelectItem>
                      <SelectItem value="services">Serviços</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Timezone</Label>
                  <Select defaultValue="sao_paulo">
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="sao_paulo">America/Sao_Paulo (GMT-3)</SelectItem>
                      <SelectItem value="new_york">America/New_York (GMT-5)</SelectItem>
                      <SelectItem value="london">Europe/London (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground">Cancel</Button>
                <Button className="btn-premium" onClick={() => setIsDialogOpen(false)}>Create Workspace</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold font-display text-foreground">{clients.length}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold font-display text-foreground">{totalLeads.toLocaleString()}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conversions</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold font-display text-foreground">{totalConversions.toLocaleString()}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Erro ao carregar clientes</p>
            <p className="text-sm opacity-80">{(error as Error)?.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto text-destructive">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Table — skeleton enquanto carrega */}
      {isLoading ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <tbody>
              {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <DataTable columns={columns} data={clients} keyField="id" />
      )}
    </div>
  );
}
