import { useState } from 'react';
import { Plus, Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getInstancesByWorkspace, Instance } from '@/data/demoData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Instances() {
  const { currentWorkspace } = useWorkspace();
  const instances = getInstancesByWorkspace(currentWorkspace.id);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  const resetOnboarding = () => {
    setOnboardingStep(1);
    setIsConnectDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Instances</h1>
          <p className="text-muted-foreground mt-1">
            Manage your WhatsApp connections
          </p>
        </div>
        <Dialog open={isConnectDialogOpen} onOpenChange={(open) => { if (!open) resetOnboarding(); else setIsConnectDialogOpen(true); }}>
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
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      step <= onboardingStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={cn('flex-1 h-0.5 mx-2', step < onboardingStep ? 'bg-primary' : 'bg-border')} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="py-4">
              {onboardingStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Instance Name</Label>
                    <Input placeholder="e.g., botzap-principal" className="bg-secondary border-border" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose a unique name for this WhatsApp instance.
                  </p>
                </div>
              )}
              {onboardingStep === 2 && (
                <div className="space-y-4 text-center">
                  <div className="w-48 h-48 mx-auto bg-secondary rounded-xl flex items-center justify-center border border-border">
                    <QrCode className="w-32 h-32 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code
                  </p>
                  <Button variant="outline" size="sm" className="text-muted-foreground">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh QR Code
                  </Button>
                </div>
              )}
              {onboardingStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which events to receive:
                  </p>
                  <div className="space-y-3">
                    {['Messages received', 'Messages sent', 'Status updates', 'Contact updates', 'Group events'].map((event) => (
                      <label key={event} className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                        <span className="text-foreground text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {onboardingStep > 1 && (
                <Button variant="ghost" onClick={() => setOnboardingStep((s) => s - 1)} className="text-muted-foreground">
                  Back
                </Button>
              )}
              {onboardingStep < 3 ? (
                <Button className="btn-premium" onClick={() => setOnboardingStep((s) => s + 1)}>
                  Next
                </Button>
              ) : (
                <Button className="btn-premium" onClick={resetOnboarding}>
                  Activate Instance
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map((instance) => (
          <InstanceCard key={instance.id} instance={instance} />
        ))}
      </div>
    </div>
  );
}

function InstanceCard({ instance }: { instance: Instance }) {
  const isConnected = instance.status === 'connected';

  return (
    <Card className={cn('bg-card border-border transition-all duration-300', isConnected && 'glow-success')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                isConnected ? 'bg-success/10' : 'bg-destructive/10'
              )}
            >
              {isConnected ? (
                <Wifi className="w-6 h-6 text-success" />
              ) : (
                <WifiOff className="w-6 h-6 text-destructive" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{instance.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{instance.phone}</p>
            </div>
          </div>
          <StatusBadge status={instance.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Events</span>
            </div>
            <p className="text-xl font-bold text-foreground">{instance.events.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs">Messages</span>
            </div>
            <p className="text-xl font-bold text-foreground">{instance.messagesTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* Last Ping */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last ping</span>
          <span className={cn('font-medium', isConnected ? 'text-success' : 'text-destructive')}>
            {instance.lastPing}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button variant="outline" size="sm" className="flex-1 text-muted-foreground border-border">
                Disconnect
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-muted-foreground border-border">
                Restart
              </Button>
            </>
          ) : (
            <Button className="flex-1 btn-premium">
              <QrCode className="w-4 h-4 mr-2" />
              Reconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
