// src/pages/Instances.tsx — Real data via TanStack Query, zero demoData
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Smartphone, Wifi, WifiOff, QrCode, RefreshCw,
  Activity, AlertCircle, Loader2, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { api, Instance } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---- N8N Webhook URL para onboard ----
// Deve ser configurada como VITE_N8N_BASE_URL no .env
const N8N_BASE = String((import.meta as any).env?.VITE_N8N_BASE_URL || '').trim();

function formatDate(ts?: string | null) {
  if (!ts) return '—';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ptBR });
  } catch {
    return ts;
  }
}

function SkeletonCard() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export default function Instances() {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [instanceName, setInstanceName] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [qrData, setQrData] = useState<{ qr_base64?: string | null; qr_code_url?: string | null } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: instances, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const result = await api.instances();
      if (!result.ok) throw new Error(result.error);
      return result.data as Instance[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const resetOnboarding = () => {
    setOnboardingStep(1);
    setInstanceName('');
    setQrData(null);
    setIsConnectOpen(false);
  };

  const handleOnboardNext = async () => {
    if (onboardingStep === 1) {
      const trimmed = instanceName.trim();
      if (!trimmed || !/^[a-zA-Z0-9_\-]{3,60}$/.test(trimmed)) {
        toast({ title: 'Nome inválido', description: 'Use letras, números, hífen. 3–60 caracteres.', variant: 'destructive' });
        return;
      }

      if (!N8N_BASE) {
        toast({ title: 'VITE_N8N_BASE_URL não configurada', description: 'Configure a variável de ambiente do n8n.', variant: 'destructive' });
        return;
      }

      setIsOnboarding(true);
      try {
        const res = await fetch(`${N8N_BASE}/webhook/onboard-instance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: localStorage.getItem('oneeleven_workspace_id') || '',
            instance_name: trimmed,
          }),
        });
        const json = await res.json();
        if (json?.ok && (json?.qr_base64 || json?.qr_code_url)) {
          setQrData({ qr_base64: json.qr_base64, qr_code_url: json.qr_code_url });
          await queryClient.invalidateQueries({ queryKey: ['instances'] });
          setOnboardingStep(2);
        } else {
          toast({ title: 'Erro no onboard', description: json?.error || 'Resposta inesperada do n8n.', variant: 'destructive' });
        }
      } catch (e: any) {
        toast({ title: 'Falha de rede', description: String(e?.message || e), variant: 'destructive' });
      } finally {
        setIsOnboarding(false);
      }
    } else if (onboardingStep === 2) {
      setOnboardingStep(3);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['instances'] });
      resetOnboarding();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Instances</h1>
          <p className="text-muted-foreground mt-1">Manage your WhatsApp connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-muted-foreground" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={isConnectOpen} onOpenChange={(o) => { if (!o) resetOnboarding(); else setIsConnectOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="btn-premium">
                <Plus className="w-4 h-4 mr-2" />
                Connect Instance
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Connect WhatsApp Instance</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Step {onboardingStep} of 3
                </DialogDescription>
              </DialogHeader>

              {/* Stepper */}
              <div className="flex items-center gap-2 py-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      step <= onboardingStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={cn('flex-1 h-0.5 mx-2', step < onboardingStep ? 'bg-primary' : 'bg-border')} />
                    )}
                  </div>
                ))}
              </div>

              <div className="py-4">
                {onboardingStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Instance Name</Label>
                      <Input
                        placeholder="e.g., botzap-principal"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        className="bg-secondary border-border"
                        disabled={isOnboarding}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nome único para esta instância WhatsApp. Apenas letras, números e hífen.
                    </p>
                  </div>
                )}
                {onboardingStep === 2 && (
                  <div className="space-y-4 text-center">
                    {qrData?.qr_base64 ? (
                      <img
                        src={`data:image/png;base64,${qrData.qr_base64}`}
                        alt="QR Code WhatsApp"
                        className="w-48 h-48 mx-auto rounded-xl border border-border object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 mx-auto bg-secondary rounded-xl flex items-center justify-center border border-border">
                        <QrCode className="w-32 h-32 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Abra o WhatsApp → Configurações → Dispositivos Vinculados → Vincular Dispositivo → Escaneie este QR
                    </p>
                  </div>
                )}
                {onboardingStep === 3 && (
                  <div className="text-center space-y-3 py-4">
                    <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                      <Wifi className="w-8 h-8 text-success" />
                    </div>
                    <p className="text-foreground font-medium">Instância configurada!</p>
                    <p className="text-sm text-muted-foreground">
                      Aguarde a conexão ser estabelecida. O status atualizará automaticamente.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {onboardingStep > 1 && (
                  <Button variant="ghost" onClick={() => setOnboardingStep((s) => s - 1)} className="text-muted-foreground" disabled={isOnboarding}>
                    Voltar
                  </Button>
                )}
                <Button className="btn-premium" onClick={handleOnboardNext} disabled={isOnboarding}>
                  {isOnboarding ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
                  ) : onboardingStep < 3 ? 'Próximo' : 'Concluir'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Erro ao carregar instâncias</p>
            <p className="text-sm opacity-80">{(error as Error)?.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto text-destructive">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Instances Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !instances?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Nenhuma instância conectada</p>
          <p className="text-sm mt-1">Clique em "Connect Instance" para adicionar sua primeira conexão WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onRefresh={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function InstanceCard({ instance, onRefresh }: { instance: Instance; onRefresh: () => void }) {
  const isConnected  = instance.status === 'connected';
  const isConnecting = instance.status === 'connecting' || instance.status === 'qrcode';

  return (
    <Card className={cn(
      'bg-card border-border transition-all duration-300',
      isConnected && 'glow-success'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isConnected  ? 'bg-success/10'  : isConnecting ? 'bg-warning/10' : 'bg-destructive/10'
            )}>
              {isConnected  ? <Wifi   className="w-6 h-6 text-success" />  :
               isConnecting ? <Loader2 className="w-6 h-6 text-warning animate-spin" /> :
                              <WifiOff className="w-6 h-6 text-destructive" />}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{instance.instance_name}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{instance.evo_instance_id || instance.id}</p>
            </div>
          </div>
          <StatusBadge status={instance.status as any} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Status</span>
            </div>
            <p className="text-sm font-medium text-foreground capitalize">{instance.status}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Criada</span>
            </div>
            <p className="text-xs font-medium text-foreground">{formatDistanceToNow(new Date(instance.created_at || Date.now()), { addSuffix: true, locale: ptBR })}</p>
          </div>
        </div>

        {/* QR Code se em modo de pareamento */}
        {instance.qr_base64 && !isConnected && (
          <div className="text-center">
            <img
              src={`data:image/png;base64,${instance.qr_base64}`}
              alt="QR Code"
              className="w-32 h-32 mx-auto rounded-lg border border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">Escaneie para conectar</p>
          </div>
        )}

        <div className="flex gap-2">
          {isConnected ? (
            <Button variant="outline" size="sm" className="flex-1 text-muted-foreground border-border">
              Desconectar
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 text-muted-foreground border-border" onClick={() => onRefresh()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
