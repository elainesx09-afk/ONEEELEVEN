import { useState } from 'react';
import { Search, Filter, Send, Phone, UserPlus, ArrowRight, Image, Mic, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getConversationsByWorkspace, Conversation, Message } from '@/data/demoData';
import { cn } from '@/lib/utils';

export default function Inbox() {
  const { currentWorkspace } = useWorkspace();
  const conversations = getConversationsByWorkspace(currentWorkspace.id);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    conversations[0] || null
  );
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(
    (c) =>
      c.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                onClick={() => setSelectedConversation(conv)}
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
                      {conv.leadName.split(' ').map((n) => n[0]).join('')}
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
                      {conv.lastMessageAt}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
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
                  {selectedConversation.leadName.split(' ').map((n) => n[0]).join('')}
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
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-b border-border flex gap-2 overflow-x-auto">
            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap border-border text-muted-foreground hover:text-foreground">
              Transferir p/ humano
            </Button>
            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap border-border text-muted-foreground hover:text-foreground">
              Marcar como qualificado
            </Button>
            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap border-border text-muted-foreground hover:text-foreground">
              Agendar follow-up
            </Button>
            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap border-border text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-3 h-3 mr-1" />
              Mover no pipeline
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {selectedConversation.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Image className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Mic className="w-5 h-5" />
              </Button>
              <Input
                placeholder="Type a message..."
                className="flex-1 bg-secondary border-border"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <Button className="btn-premium" size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isUser
            ? 'bg-secondary text-foreground rounded-bl-sm'
            : 'bg-primary text-primary-foreground rounded-br-sm'
        )}
      >
        {message.type === 'audio' && (
          <div className="flex items-center gap-2 py-1">
            <Mic className="w-4 h-4" />
            <div className="w-24 h-1 bg-current/30 rounded-full" />
            <span className="text-xs">0:15</span>
          </div>
        )}
        {message.type === 'image' && (
          <div className="w-48 h-32 bg-secondary/50 rounded-lg flex items-center justify-center mb-2">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {message.type === 'text' && <p className="text-sm">{message.content}</p>}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={cn('text-[10px]', isUser ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
            {message.timestamp}
          </span>
          {!isUser && message.status && (
            <span className="text-[10px] text-primary-foreground/70">
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
