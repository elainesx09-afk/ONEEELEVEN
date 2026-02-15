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
  kpiData,
  chartData,
  getConversationsByWorkspace,
  getInstancesByWorkspace,
  getLeadsByWorkspace,
} from '@/data/demoData';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Micro sparkline component
function Sparkline({ data, color = 'primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-300",
            color === 'primary' ? 'bg-primary/60' : 'bg-warning/60'
          )}
          style={{ 
            height: `${((value - min) / range) * 100}%`,
            minHeight: '4px',
            animationDelay: `${i * 50}ms`
          }}
        />
      ))}
    </div>
  );
}

// Activity item component
function ActivityItem({ 
  icon: Icon, 
  title, 
  time, 
  type 
}: { 
  icon: React.ElementType; 
  title: string; 
  time: string; 
  type: 'success' | 'info' | 'warning' 
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-all duration-200 group cursor-pointer">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
        type === 'success' && 'bg-success/10 text-success',
        type === 'info' && 'bg-primary/10 text-primary',
        type === 'warning' && 'bg-warning/10 text-warning'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

// Quick stat card
function QuickStat({ 
  label, 
  value, 
  trend, 
  trendUp 
}: { 
  label: string; 
  value: string | number; 
  trend: string; 
  trendUp: boolean 
}) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 cursor-pointer group">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
          {value}
        </span>
        <span className={cn(
          "flex items-center text-xs font-medium",
          trendUp ? "text-success" : "text-destructive"
        )}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </span>
      </div>
    </div>
  );
}

export default function Overview() {
  const { currentWorkspace } = useWorkspace();
  const conversations = getConversationsByWorkspace(currentWorkspace.id);
  const instances = getInstancesByWorkspace(currentWorkspace.id);
  const leads = getLeadsByWorkspace(currentWorkspace.id);
  
  const connectedInstances = instances.filter(i => i.status === 'connected').length;
  const hasDisconnectedInstances = instances.some(i => i.status === 'disconnected');
  
  // Calculate more useful metrics
  const qualifiedLeads = leads.filter(l => l.stage === 'qualificando' || l.stage === 'proposta').length;
  const hotLeads = leads.filter(l => l.score >= 80).length;
  const needsFollowUp = leads.filter(l => l.needsFollowUp).length;
  const conversionRate = leads.length > 0 ? ((leads.filter(l => l.stage === 'ganhou').length / leads.length) * 100).toFixed(1) : '0';
  
  // Sparkline data (mock)
  const messageSparkline = [12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45];
  const leadsSparkline = [5, 8, 6, 10, 12, 9, 15, 14, 18, 16, 20, 22];

  // Hourly activity data
  const hourlyData = [
    { hour: '08h', messages: 12 },
    { hour: '10h', messages: 28 },
    { hour: '12h', messages: 35 },
    { hour: '14h', messages: 45 },
    { hour: '16h', messages: 38 },
    { hour: '18h', messages: 22 },
    { hour: '20h', messages: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao painel de {currentWorkspace.name}
        </p>
      </div>

      {/* KPIs Grid - with staggered animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "Total Messages", value: kpiData.totalMessages, icon: MessageSquare, change: "+12% vs last week", changeType: "positive" as const, delay: 0 },
          { title: "Leads Quentes", value: hotLeads, icon: Zap, change: `${hotLeads > 3 ? '+' + (hotLeads - 3) : '0'} hoje`, changeType: "positive" as const, delay: 50, iconClassName: "bg-warning/10 group-hover:bg-warning/20" },
          { title: "Taxa de Conversão", value: `${conversionRate}%`, icon: Target, change: "+2.3% vs mês anterior", changeType: "positive" as const, delay: 100 },
          { title: "Follow-up Conversions", value: kpiData.followUpConversions, icon: Trophy, change: "+23% this month", changeType: "positive" as const, delay: 150, iconClassName: "bg-success/10 group-hover:bg-success/20" },
          { title: "ROI Estimado", value: "R$ 12.4k", icon: TrendingUp, change: "3.2x retorno", changeType: "positive" as const, delay: 200 },
        ].map((kpi, index) => (
          <div 
            key={kpi.title}
            className="animate-fade-in"
            style={{ animationDelay: `${kpi.delay}ms` }}
          >
            <KPICard {...kpi} />
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '250ms' }}>
        <QuickStat label="Taxa de Conversão" value={`${conversionRate}%`} trend="2.3%" trendUp={true} />
        <QuickStat label="Leads Quentes" value={hotLeads} trend="5 novos" trendUp={true} />
        <QuickStat label="Precisam Follow-up" value={needsFollowUp} trend="3 urgentes" trendUp={false} />
        <QuickStat label="Leads Qualificados" value={qualifiedLeads} trend="12%" trendUp={true} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 bg-card border-border animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Leads vs Conversions
              </CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Leads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-muted-foreground">Conversions</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.leadsVsConversions}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="hsl(var(--primary))"
                    fill="url(#leadsGradient)"
                    strokeWidth={2}
                    name="Leads"
                    animationDuration={1000}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke="hsl(var(--warning))"
                    fill="url(#conversionsGradient)"
                    strokeWidth={2}
                    name="Conversions"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Magic Formula Card */}
        <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '350ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-warning animate-pulse" />
              Magic Formula Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <MagicFormulaItem label="WhatsApp conectado" status={connectedInstances > 0 ? 'complete' : 'warning'} />
            <MagicFormulaItem label="Funil configurado" status="complete" />
            <MagicFormulaItem label="Follow-ups ativos" status="complete" />
            <MagicFormulaItem label="Conversões rastreadas" status="complete" />
            
            <div className="pt-4 mt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status Geral</span>
                <span className="text-primary font-semibold animate-pulse">Operacional</span>
              </div>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-premium rounded-full transition-all duration-1000 ease-out"
                  style={{ width: connectedInstances > 0 ? '100%' : '75%' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Activity and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Activity */}
        <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Atividade Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="messages" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                <span className="text-sm text-muted-foreground">Pico às 14h</span>
              </div>
              <span className="text-sm font-semibold text-foreground">195 msgs</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '450ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ActivityItem icon={Trophy} title="Maria Silva converteu!" time="Há 5 min" type="success" />
            <ActivityItem icon={MessageSquare} title="Nova conversa iniciada" time="Há 12 min" type="info" />
            <ActivityItem icon={Target} title="Lead qualificado: João" time="Há 25 min" type="info" />
            <ActivityItem icon={Clock} title="Follow-up enviado" time="Há 1h" type="warning" />
            <ActivityItem icon={Users} title="3 novos leads" time="Há 2h" type="success" />
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '500ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mensagens (7d)</span>
                <Sparkline data={messageSparkline} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Leads (7d)</span>
                <Sparkline data={leadsSparkline} color="warning" />
              </div>
            </div>
            
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meta do mês</span>
                <span className="text-sm font-semibold text-foreground">78%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full w-[78%] bg-gradient-premium rounded-full transition-all duration-1000" />
              </div>
              <p className="text-xs text-muted-foreground">
                Faltam <span className="text-primary font-medium">12 conversões</span> para bater a meta
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations */}
      <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '550ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Recent Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {conversations.slice(0, 5).map((conv, index) => (
              <div
                key={conv.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 hover:translate-x-1 transition-all duration-200 cursor-pointer group"
                style={{ animationDelay: `${600 + index * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-sm font-semibold text-primary">
                    {conv.leadName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">{conv.leadName}</span>
                    {conv.unread > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full animate-pulse">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {conv.lastMessageAt}
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
