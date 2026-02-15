import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, Phone, UserPlus, Image, Mic, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Lead, type Message } from '@/lib/api';

type Conversation = {
  id: string;
  leadName: string;
  leadPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  tags: string[];
};

function safeInitials(name?: string | null) {
  const n = String(name || 'Lead').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'L';
}

export default function Inbox() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  const [selected, setSelected] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [] as Lead[];
      return r.data ?? [];
    },
    staleTime: 10_000,
    retry: 1,
  });

  const conversations: Conversation[] = useMemo(() => {
    const leads = (leadsQuery.data ?? []) as any[];
    return leads.map((l: any) => ({
      id: String(l.id),
      leadName: String(l.name ?? l.full_name ?? l.nome ?? 'Lead'),
      leadPhone: String(l.phone ?? l.whatsapp ?? l.numero ?? ''),
      lastMessage: String(l.last_message ?? l.lastMessage ?? l.last_message_text ?? ''),
      lastMessageAt: String(l.last_message_at ?? l.updated_at ?? l.created_at ?? ''),
      unread: Number(l.unread ?? 0),
      tags: Array.isArray(l.tags) ? l.tags : [],
    }));
  }, [leadsQuery.data]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.leadName.toLowerCase().includes(q) ||
        c.leadPhone.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // ✅ seleção automática por URL: /inbox?lead_id=...
  const leadIdFromUrl = searchParams.get('lead_id');
  const selectedId = useMemo(() => {
    if (leadIdFromUrl) return leadIdFromUrl;
    if (selected) return selected;
    return conversations[0]?.id ?? null;
  }, [leadIdFromUrl, selected, conversations]);

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return conversations.find((c) => c.id === selectedId) ?? null;
  }, [conversations, selectedId]);

  const messagesQuery = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      const r = await api.messages(selectedConversation!.id);
      if (!r.ok) return [] as Message[];
      return r.data ?? [];
    },
    enabled: !!selectedConversation?.id,
    staleTime: 5_000,
    retry: 1,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ leadId, body }: { leadId: string; body: string }) => {
      const r = await api.sendMessage(leadId, body);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  const messages: any[] = (messagesQuery.data ?? []) as any[];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
      {/* Conversations List */}
      <div className="w-96 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 bg-secondary border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">All</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-secondary/80 border-border text-muted-foreground">Active</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-secondary/80 border-border text-muted-foreground">Waiting</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-secondary/80 border-border text-muted-foreground">Resolved</Badge>
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelected(conv.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  selectedConversation?.id === conv.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-secondary/50'
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      {safeInitials(conv.leadName)}
                    </span>
                  </div>
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground truncate">{conv.leadName}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage || '—'}</p>
                  <div className="flex gap-1 mt-1">
                    {conv.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {leadsQuery.isLoading && (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            )}
            {!leadsQuery.isLoading && filteredConversations.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No conversations.</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {safeInitials(selectedConversation.leadName)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{selectedConversation.leadName}</h3>
                <p className="text-xs text-muted-foreground">{selectedConversation.leadPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-muted-foreground border-border">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" size="sm" className="text-muted-foreground border-border">
                <UserPlus className="w-4 h-4 mr-2" />
                Transfer
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((m) => {
                const direction = String((m as any).direction ?? (m as any).dir ?? 'out');
                const mine = direction !== 'in';
                const body = String((m as any).body ?? (m as any).text ?? (m as any).content ?? '');
                const createdAt = (m as any).created_at ?? (m as any).createdAt ?? null;

                return (
                  <div key={String((m as any).id ?? `${createdAt}-${body.slice(0, 8)}`)} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-4 py-2 text-sm', mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}>
                      <div>{body}</div>
                      <div className={cn('mt-1 text-[10px] opacity-70', mine ? 'text-primary-foreground' : 'text-muted-foreground')}>
                        {createdAt ? new Date(createdAt).toLocaleTimeString() : ''}
                      </div>
                    </div>
                  </div>
                );
              })}

              {messagesQuery.isLoading && (
                <div className="text-sm text-muted-foreground">Loading messages...</div>
              )}
              {!messagesQuery.isLoading && messages.length === 0 && (
                <div className="text-sm text-muted-foreground">No messages yet.</div>
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="bg-secondary border-border"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!messageInput.trim()) return;
                      sendMutation.mutate({ leadId: selectedConversation.id, body: messageInput.trim() });
                      setMessageInput('');
                    }
                  }}
                />
              </div>

              <Button variant="outline" size="icon" className="border-border text-muted-foreground">
                <Image className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="border-border text-muted-foreground">
                <Mic className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => {
                  if (!messageInput.trim()) return;
                  sendMutation.mutate({ leadId: selectedConversation.id, body: messageInput.trim() });
                  setMessageInput('');
                }}
                disabled={sendMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-xl">
          <div className="text-muted-foreground">Select a conversation</div>
        </div>
      )}
    </div>
  );
}
