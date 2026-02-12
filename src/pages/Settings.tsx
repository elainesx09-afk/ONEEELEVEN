import { Palette, Users, CreditCard, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function Settings() {
  const { currentWorkspace } = useWorkspace();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace settings</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" />Branding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Company Name</label><Input defaultValue={currentWorkspace.name} className="bg-secondary border-border" /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Primary Color</label><div className="flex gap-2"><Input defaultValue="#10b981" className="bg-secondary border-border" /><div className="w-10 h-10 rounded-lg bg-primary" /></div></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Logo</label><div className="w-32 h-32 bg-secondary rounded-xl flex items-center justify-center border-2 border-dashed border-border"><span className="text-muted-foreground text-sm">Upload</span></div></div>
              <Button className="btn-premium">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Team Members</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[{ name: 'Admin User', email: 'admin@agency.com', role: 'Owner' }, { name: 'Ana Costa', email: 'ana@agency.com', role: 'Admin' }, { name: 'Carlos Mendes', email: 'carlos@agency.com', role: 'Member' }].map((user, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-sm font-semibold text-primary">{user.name.split(' ').map(n => n[0]).join('')}</span></div><div><p className="font-medium text-foreground">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div></div>
                  <Badge variant="outline" className="border-border">{user.role}</Badge>
                </div>
              ))}
              <Button variant="outline" className="border-border text-muted-foreground">Invite Member</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-warning" />Current Plan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/20 to-card rounded-lg border border-warning/30">
                <div><p className="text-lg font-bold text-foreground">Pro Plan</p><p className="text-sm text-muted-foreground">R$ 497/mês</p></div>
                <Badge className="bg-warning/20 text-warning border-warning/30">Active</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-sm text-muted-foreground">Instances</p><p className="text-2xl font-bold text-foreground">3 / 5</p></div>
                <div className="p-4 bg-secondary/50 rounded-lg"><p className="text-sm text-muted-foreground">Messages</p><p className="text-2xl font-bold text-foreground">14.8k / 50k</p></div>
              </div>
              <Button className="btn-gold">Upgrade Plan</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
