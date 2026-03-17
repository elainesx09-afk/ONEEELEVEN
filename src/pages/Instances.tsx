import { useState } from "react";
import { Plus, Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Instances() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const r = await api.instances();
      return r.ok ? r.data : [];
    },
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: () => api.registerInstance({ instance_name: instanceName || "default" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instances"] }); setOpen(false); setInstanceName(""); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Instâncias</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-premium"><Plus className="w-4 h-4 mr-2" /> Nova Instância</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>Conectar WhatsApp</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da instância</Label>
                <Input
                  placeholder="ex: vendas-principal"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full btn-premium"
              >
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</> : "Criar Instância"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : instances.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-40 gap-3">
            <Smartphone className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Nenhuma instância conectada</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Conectar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(instances as any[]).map((inst) => (
            <Card key={inst.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    {inst.instance_name || inst.name || "Instância"}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      inst.status === "connected" || inst.status === "open"
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    )}
                  >
                    {inst.status === "connected" || inst.status === "open" ? (
                      <><Wifi className="w-3 h-3 mr-1" /> Conectado</>
                    ) : (
                      <><WifiOff className="w-3 h-3 mr-1" /> Desconectado</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono truncate">{inst.id}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
