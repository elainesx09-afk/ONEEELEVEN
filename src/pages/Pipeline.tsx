import { useMemo, useState } from 'react';
import { Plus, Clock, Star, MessageSquare, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Lead } from '@/lib/api';
import { cn } from '@/lib/utils';

type PipelineStage = 'novo' | 'qualificando' | 'proposta' | 'follow-up' | 'ganhou' | 'perdido';

const stages: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo', color: 'bg-info' },
  { id: 'qualificando', label: 'Qualificando', color: 'bg-purple-500' },
  { id: 'proposta', label: 'Proposta', color: 'bg-warning' },
  { id: 'follow-up', label: 'Follow-up', color: 'bg-orange-500' },
  { id: 'ganhou', label: 'Ganhou', color: 'bg-success' },
  { id: 'perdido', label: 'Perdido', color: 'bg-destructive' },
];

export default function Pipeline() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ['leads', currentWorkspace.id],
    queryFn: () => api.getLeads(),
  });

  const updateStage = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: PipelineStage }) =>
      api.updateLeadStage(leadId, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const leadsState = useMemo(() => {
    const raw = leadsQuery.data ?? [];
    return raw.map((l: any) => ({
      ...l,
      name: l.name ?? l.full_name ?? l.nome ?? 'Lead',
      phone: l.phone ?? l.number ?? l.whatsapp ?? '',
      stage: (l.stage ?? 'novo') as PipelineStage,
      score: typeof l.score === 'number' ? l.score : 50,
      lastMessage: l.lastMessage ?? l.last_message ?? l.last_message_text ?? '',
      nextAction: l.nextAction ?? l.next_action ?? '',
      tags: Array.isArray(l.tags) ? l.tags : [],
    })) as any[];
  }, [leadsQuery.data]);

  const getLeadsByStage = (stage: PipelineStage) =>
    leadsState.filter((l) => (l.stage ?? 'novo') === stage);

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: PipelineStage) => {
    if (draggedLead) {
      updateStage.mutate({ leadId: draggedLead, stage });
      setDraggedLead(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Visualize and manage your sales funnel
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div
              key={stage.id}
              className="kanban-column flex-shrink-0"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                  <h3 className="font-semibold text-foreground">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Cards */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-2">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className={cn(
                        'kanban-card',
                        draggedLead === lead.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {lead.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-foreground">{lead.name}</h4>
                            <p className="text-xs text-muted-foreground">{lead.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className={cn('w-3 h-3', lead.score >= 80 ? 'text-warning fill-warning' : 'text-muted-foreground')} />
                          <span className="text-xs font-medium text-foreground">{lead.score}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {lead.lastMessage}
                      </p>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {lead.lastMessageAt}
                        </div>
                        {lead.needsFollowUp && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30">
                            Needs Follow-up
                          </Badge>
                        )}
                      </div>

                      {lead.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {lead.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {selectedLead?.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.phone}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Source</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.source}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Score</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.score}/100</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Last Activity</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.lastMessageAt}</p>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Follow-up History</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-foreground">D+0 - Initial contact</span>
                    <Badge variant="secondary" className="text-[10px]">Sent</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">D+1 - Follow-up 1</span>
                    <Badge variant="outline" className="text-[10px] border-border">Pending</Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 btn-premium">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Open Chat
                </Button>
                <Button variant="outline" className="flex-1 border-border text-muted-foreground">
                  Edit Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
