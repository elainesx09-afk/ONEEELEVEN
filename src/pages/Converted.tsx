import { Trophy, TrendingUp, DollarSign, MessageSquare, Calendar, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getConversionsByWorkspace, ConversionRecord, chartData, kpiData } from '@/data/demoData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Converted() {
  const { currentWorkspace } = useWorkspace();
  const conversions = getConversionsByWorkspace(currentWorkspace.id);

  const totalRevenue = conversions.reduce((acc, c) => acc + c.estimatedValue, 0);
  const avgTicket = conversions.length > 0 ? totalRevenue / conversions.length : 0;
  const saasMonthly = 497; // Mock SaaS cost
  const roi = totalRevenue - saasMonthly;

  const columns = [
    {
      key: 'leadName',
      header: 'Lead',
      render: (item: ConversionRecord) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-success" />
          </div>
          <span className="font-medium text-foreground">{item.leadName}</span>
        </div>
      ),
    },
    {
      key: 'conversionDate',
      header: 'Conversion Date',
      render: (item: ConversionRecord) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {new Date(item.conversionDate).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
    {
      key: 'sequenceUsed',
      header: 'Sequence Used',
      render: (item: ConversionRecord) => (
        <Badge variant="outline" className="border-primary/30 text-primary">
          {item.sequenceUsed}
        </Badge>
      ),
    },
    {
      key: 'messagesUntilConversion',
      header: 'Messages',
      render: (item: ConversionRecord) => (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.messagesUntilConversion}</span>
        </div>
      ),
    },
    {
      key: 'estimatedValue',
      header: 'Value',
      render: (item: ConversionRecord) => (
        <span className="font-semibold text-success">
          R$ {item.estimatedValue.toLocaleString('pt-BR')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Converted</h1>
        <p className="text-muted-foreground mt-1">
          Leads converted through follow-up sequences
        </p>
      </div>

      {/* Main Metric - Gold Glow */}
      <Card className="bg-gradient-to-br from-warning/20 via-warning/10 to-card border-warning/30 glow-gold overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-warning/5 via-transparent to-warning/5 animate-pulse" style={{ animationDuration: '3s' }} />
        <CardContent className="pt-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-warning/80 font-medium mb-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
                Conversões por Follow-up
              </p>
              <p className="text-5xl font-bold font-display text-warning">{conversions.length}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Leads que converteram após receberem sequências automáticas
              </p>
            </div>
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-warning/30 to-warning/10 flex items-center justify-center shadow-lg shadow-warning/20">
              <Trophy className="w-12 h-12 text-warning drop-shadow-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold font-display text-foreground">
                  R$ {totalRevenue.toLocaleString('pt-BR')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Ticket</p>
                <p className="text-2xl font-bold font-display text-foreground">
                  R$ {avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Messages</p>
                <p className="text-2xl font-bold font-display text-foreground">
                  {conversions.length > 0
                    ? Math.round(
                        conversions.reduce((acc, c) => acc + c.messagesUntilConversion, 0) /
                          conversions.length
                      )
                    : 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        {/* ROI Card */}
        <Card className="bg-gradient-to-br from-warning/20 to-card border-warning/30 glow-gold">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning/80 font-medium">ROI (mock)</p>
                <p className="text-2xl font-bold font-display text-warning">
                  R$ {roi.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue - SaaS (R$ {saasMonthly})
                </p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Conversões por Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.conversionsByWeek}>
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
                <Bar dataKey="conversions" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Conversions Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">All Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={conversions} keyField="id" />
        </CardContent>
      </Card>
    </div>
  );
}
