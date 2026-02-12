import { useState } from 'react';
import { Bot as BotIcon, Sparkles, Copy, Check, Settings, MessageSquare, Target, Smile, Package, HelpCircle, FileText, Shield, Wrench, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { demoBotConfig } from '@/data/demoData';

export default function Bot() {
  const { currentWorkspace } = useWorkspace();
  const [config, setConfig] = useState(demoBotConfig);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatedPrompt = `Você é ${config.agentName}, ${config.presentation} da ${config.companyName}.

MISSÃO: ${config.mission}

ESCOPO: ${config.scope.join(', ')}

TOM: ${config.tone} | Emojis: ${config.emojis}

PRODUTOS:
${config.products.map(p => `- ${p.name}: ${p.price} - ${p.description}`).join('\n')}

QUALIFICAÇÃO:
${config.qualificationQuestions.map(q => `- ${q}`).join('\n')}

REGRAS CRÍTICAS:
${config.criticalRules.map(r => `⚠️ ${r}`).join('\n')}`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Bot Configuration</h1>
          <p className="text-muted-foreground mt-1">Configure your AI sales agent</p>
        </div>
        <Button className="btn-gold" onClick={() => setShowPrompt(true)}>
          <Sparkles className="w-4 h-4 mr-2" />
          Gerar Prompt do Agente
        </Button>
      </div>

      {/* Main Layout: Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="identity" className="space-y-6">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BotIcon className="w-4 h-4 text-primary" />Company</CardTitle></CardHeader>
                  <CardContent><Input defaultValue={config.companyName} className="bg-secondary border-border" /></CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Agent Name</CardTitle></CardHeader>
                  <CardContent><Input defaultValue={config.agentName} className="bg-secondary border-border" /></CardContent>
                </Card>
              </div>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Mission</CardTitle></CardHeader>
                <CardContent><Textarea defaultValue={config.mission} className="bg-secondary border-border" rows={3} /></CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base">Presentation Style</CardTitle></CardHeader>
                <CardContent>
                  <Select defaultValue={config.presentation}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Central de Vendas">Central de Vendas</SelectItem>
                      <SelectItem value="Consultor">Consultor</SelectItem>
                      <SelectItem value="Atendente">Atendente</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />Tone</CardTitle></CardHeader>
                  <CardContent>
                    <Select defaultValue={config.tone}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="profissional">Profissional</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="consultivo">Consultivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Smile className="w-4 h-4 text-warning" />Emojis</CardTitle></CardHeader>
                  <CardContent>
                    <Select defaultValue={config.emojis}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="nao">Não usar</SelectItem>
                        <SelectItem value="moderado">Moderado</SelectItem>
                        <SelectItem value="livre">Livre</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-primary" />Available Products</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {config.products.map((product, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                      <div className="flex-1"><p className="font-medium text-foreground">{product.name}</p><p className="text-sm text-muted-foreground">{product.description}</p></div>
                      <Badge className="bg-success/20 text-success border-success/30">{product.price}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />Available Tools (n8n)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {config.tools.map((tool, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div><p className="font-medium text-foreground">{tool.name}</p><p className="text-xs text-muted-foreground">{tool.description}</p></div>
                      <Switch checked={tool.enabled} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Converted Card - Gold Glow */}
          <Card className="bg-gradient-to-br from-warning/20 via-warning/10 to-card border-warning/30 glow-gold animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-warning/80 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Conversões pelo Bot
                  </p>
                  <p className="text-4xl font-bold font-display text-warning">23</p>
                  <p className="text-sm text-muted-foreground">
                    Leads que converteram após interação com o agente IA
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">+18% este mês</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">R$ 34.5k</p>
                  <p className="text-xs text-muted-foreground">receita atribuída</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Regras Anti-Loucura */}
          <Card className="bg-card border-border sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-destructive" />
                Regras Anti-Loucura
              </CardTitle>
              <p className="text-xs text-muted-foreground">Limites críticos do agente</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {config.criticalRules.map((rule, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-2 p-2 bg-destructive/5 rounded-lg border border-destructive/10 transition-all hover:bg-destructive/10 hover:border-destructive/20"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Badge variant="outline" className="border-destructive/30 text-destructive shrink-0 mt-0.5">⚠️</Badge>
                  <span className="text-xs text-foreground leading-relaxed">{rule}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BotIcon className="w-4 h-4 text-primary" />
                Status do Agente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Respostas hoje</span>
                <span className="font-semibold text-foreground">147</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de sucesso</span>
                <span className="font-semibold text-success">94%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Handoffs humanos</span>
                <span className="font-semibold text-warning">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tempo médio</span>
                <span className="font-semibold text-foreground">1.2s</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2"><Sparkles className="w-5 h-5 text-warning" />Generated Agent Prompt</DialogTitle></DialogHeader>
          <pre className="bg-secondary p-4 rounded-lg text-sm text-foreground whitespace-pre-wrap font-mono">{generatedPrompt}</pre>
          <Button className="btn-premium" onClick={copyPrompt}>{copied ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Prompt</>}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
