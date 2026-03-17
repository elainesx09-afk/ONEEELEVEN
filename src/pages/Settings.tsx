import { useState } from "react";
import { Palette, Users, CreditCard, Shield, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { currentWorkspace } = useWorkspace();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState(currentWorkspace.name);

  async function handleSave() {
    setSaving(true);
    try {
      await supabase
        .from("workspaces")
        .update({ name: companyName })
        .eq("id", currentWorkspace.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do seu workspace</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="branding">Workspace</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Informações do Workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome da empresa</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Workspace ID</label>
                <Input
                  value={currentWorkspace.id}
                  readOnly
                  className="bg-secondary border-border font-mono text-xs text-muted-foreground"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="btn-premium">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> :
                  saved ? "✓ Salvo!" : <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Minha conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {(profile?.full_name || profile?.email || "U").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{profile?.full_name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-border capitalize">{profile?.role}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-warning" /> Plano atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/20 to-card rounded-lg border border-warning/30">
                <div>
                  <p className="text-lg font-bold text-foreground">Plano Pro</p>
                  <p className="text-sm text-muted-foreground">R$ 497/mês</p>
                </div>
                <Badge className="bg-warning/20 text-warning border-warning/30">Ativo</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Instâncias</p>
                  <p className="text-2xl font-bold text-foreground">3 / 5</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Mensagens</p>
                  <p className="text-2xl font-bold text-foreground">14.8k / 50k</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Credenciais de API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Workspace ID</label>
                <div className="flex gap-2">
                  <Input value={currentWorkspace.id} readOnly className="bg-secondary border-border font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(currentWorkspace.id)}>
                    Copiar
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este ID no header <code className="bg-secondary px-1 rounded">workspace_id</code> em todas as chamadas à API.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
