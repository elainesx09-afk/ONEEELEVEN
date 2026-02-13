import {
  MessageSquare,
  Users,
  Smartphone,
  Trophy,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  Target,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard, MagicFormulaItem } from '@/components/ui/kpi-card';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  kpiData as demoKpiData,
  chartData as demoChartData,
  getConversationsByWorkspace,
  getInstancesByWorkspace,
  getLeadsByWorkspace,
} from '@/data/demoData';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isDemoMode } from '@/lib/demoMode';

type OverviewApi = {
  total_messages?: number;
  hot_leads?: number;
  conversion_rate?: number;
  followup_conversions?: number;
  roi_estimated?: number;
  total_leads?: number;
  closed?: number;
  qualified?: number;
  scheduled?: number;
  lost?: number;
  new_leads?: number;
};

const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function Overview() {
  const { currentWorkspace } = useWorkspace();

  // DEMO: mantém exatamente como estava
  const demoLeads = getLeadsByWorkspace(currentWorkspace.id);
  const demoConversations = getConversationsByWorkspace(currentWorkspace.id);
  const demoInstances = getInstancesByWorkspace(currentWorkspace.id);

  // REAL: puxa do backend (Supabase)
  const { data: overviewRes } = useQuery({
    queryKey: ['overview'],
    queryFn: async () => api.overview(),
    staleTime: 15_000,
    retry: 1,
  });

  const overview: OverviewApi | null =
    !isDemoMode && overviewRes && (overviewRes as any).ok ? ((overviewRes as any).data as OverviewApi) : null;

  // KPI (REAL) — sem inventar números
  const realKpiData = {
    totalMessages: safeNum(overview?.total_messages),
    activeLeads: safeNum(overview?.total_leads ?? overview?.hot_leads), // se não vier total_leads, usa hot_leads
    connectedInstances: 0, // só quando implementarmos /api/instances real
    followUpConversions: safeNum(overview?.followup_conversions),
    avgResponseTime: '—',
    totalConversions: safeNum(overview?.closed),
    totalRevenue: safeNum(overview?.roi_estimated), // se você quiser ROI aqui; caso contrário fica 0
    avgTicket: 0,
  };

  const kpiData = isDemoMode ? demoKpiData : realKpiData;

  // Charts: em real mode, deixa vazio (sem fake). Não quebra UI.
  const chartData = isDemoMode ? demoChartData : [];

  // Leads/conversations/instances: em real mode, pode ficar vazio (até plugar endpoints específicos)
  const leads = isDemoMode ? demoLeads : [];
  const conversations = isDemoMode ? demoConversations : [];
  const instances = isDemoMode ? demoInstances : [];

  const magicFormula = [
    { label: 'WhatsApp conectado', status: true },
    { label: 'Funil configurado', status: true },
    { label: 'Follow-up ativo', status: false },
    { label: 'IA treinada', status: false },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao painel de {currentWorkspace.name}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Messages"
          value={kpiData.totalMessages.toLocaleString()}
          change="+12% vs last week"
          changeType="positive"
          icon={MessageSquare}
        />
        <KPICard
          title="Leads Quentes"
          value={String(kpiData.activeLeads)}
          change="+3 hoje"
          changeType="positive"
          icon={Zap}
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${safeNum(overview?.conversion_rate).toFixed(1)}%`}
          change="+2.3% vs mês anterior"
          changeType="positive"
          icon={Target}
        />
        <KPICard
          title="Follow-up Conversions"
          value={String(kpiData.followUpConversions)}
          change="+23% this month"
          changeType="positive"
          icon={Trophy}
        />
        <KPICard
          title="ROI Estimado"
          value={`R$ ${safeNum(overview?.roi_estimated).toLocaleString()}`}
          change="3.2x retorno"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{`${safeNum(overview?.conversion_rate).toFixed(1)}%`}</div>
              <div className="text-sm text-primary flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +2.3%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Quentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{String(kpiData.activeLeads)}</div>
              <div className="text-sm text-primary flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +5 novos
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Precisam Follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{String(0)}</div>
              <div className="text-sm text-destructive flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" />
                0 urgentes
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Qualificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{String(safeNum(overview?.qualified))}</div>
              <div className="text-sm text-primary flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +12%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Magic Formula */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Leads vs Conversions
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData as any}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                <Area type="monotone" dataKey="conversions" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Magic Formula Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {magicFormula.map((item) => (
              <MagicFormulaItem key={item.label} label={item.label} status={item.status} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
