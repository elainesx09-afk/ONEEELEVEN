import { useState } from 'react';
import { Plus, Building2, MoreHorizontal, Users, Smartphone, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { demoWorkspaces, Workspace } from '@/data/demoData';

export default function Clients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clients] = useState<Workspace[]>(demoWorkspaces);

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (item: Workspace) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            <div className="text-xs text-muted-foreground">{item.niche}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Workspace) => (
        <StatusBadge status={item.status === 'active' ? 'connected' : 'disconnected'} label={item.status} />
      ),
    },
    {
      key: 'instances',
      header: 'Instances',
      render: (item: Workspace) => (
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.instances}</span>
        </div>
      ),
    },
    {
      key: 'leads',
      header: 'Leads',
      render: (item: Workspace) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.leads}</span>
        </div>
      ),
    },
    {
      key: 'conversions',
      header: 'Conversions',
      render: (item: Workspace) => (
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <span className="text-foreground font-medium">{item.conversions}</span>
        </div>
      ),
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      render: (item: Workspace) => (
        <span className="text-muted-foreground text-sm">{item.lastActivity}</span>
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your agency's client workspaces
          </p>
        </div>
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
                <Label htmlFor="name" className="text-foreground">Company Name</Label>
                <Input id="name" placeholder="e.g., Fashion Brand Co." className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche" className="text-foreground">Niche / Industry</Label>
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
                <Label htmlFor="timezone" className="text-foreground">Timezone</Label>
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
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">WhatsApp Number</Label>
                <Input id="phone" placeholder="+55 11 99999-9999" className="bg-secondary border-border" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground">
                Cancel
              </Button>
              <Button className="btn-premium" onClick={() => setIsDialogOpen(false)}>
                Create Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold font-display text-foreground">{clients.length}</p>
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
                <p className="text-3xl font-bold font-display text-foreground">
                  {clients.reduce((acc, c) => acc + c.leads, 0)}
                </p>
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
                <p className="text-3xl font-bold font-display text-foreground">
                  {clients.reduce((acc, c) => acc + c.conversions, 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <DataTable columns={columns} data={clients} keyField="id" />
    </div>
  );
}
