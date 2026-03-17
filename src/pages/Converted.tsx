import { Trophy, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Converted() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads-converted"],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [];
      return (r.data as any[]).filter((l) =>
        ["Fechado", "Vendido", "Convertido"].includes(l.status || l.stage || "")
      );
    },
    staleTime: 15_000,
  });

  const totalValue = leads.length * 497; // estimativa placeholder
  const avgTicket = leads.length > 0 ? totalValue / leads.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Convertidos</h1>
        <p className="text-muted-foreground mt-1">Leads que fecharam negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Convertidos</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Estimada</p>
                <p className="text-2xl font-bold">R$ {totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">R$ {avgTicket.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle>Leads Convertidos</CardTitle></CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lead convertido ainda.</p>
            ) : (
              <div className="space-y-3">
                {leads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name || "Lead"}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-success/10 text-success border-success/30">Fechado</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
