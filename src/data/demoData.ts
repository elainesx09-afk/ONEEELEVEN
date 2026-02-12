// One Eleven - Demo Data & Types

export interface Workspace {
  id: string;
  name: string;
  niche: string;
  timezone: string;
  logo?: string;
  status: 'active' | 'inactive';
  instances: number;
  leads: number;
  conversions: number;
  lastActivity: string;
  createdAt: string;
}

export interface Instance {
  id: string;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastPing: string;
  events: number;
  messagesTotal: number;
  workspaceId: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  stage: 'novo' | 'qualificando' | 'proposta' | 'follow-up' | 'ganhou' | 'perdido';
  source: string;
  score: number;
  lastMessage: string;
  lastMessageAt: string;
  responsible?: string;
  needsFollowUp: boolean;
  converted: boolean;
  conversionDate?: string;
  conversionValue?: number;
  followUpSequence?: string;
  messagesUntilConversion?: number;
  tags: string[];
  workspaceId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'audio' | 'image' | 'document';
  sender: 'user' | 'bot' | 'human';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  status: 'active' | 'waiting' | 'resolved';
  messages: Message[];
  tags: string[];
  workspaceId: string;
}

export interface FollowUpStep {
  id: string;
  day: string;
  message: string;
  objective: string;
  trigger: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  steps: FollowUpStep[];
  active: boolean;
  leadsEnrolled: number;
  conversions: number;
  workspaceId: string;
}

export interface ConversionRecord {
  id: string;
  leadId: string;
  leadName: string;
  conversionDate: string;
  sequenceUsed: string;
  messagesUntilConversion: number;
  estimatedValue: number;
  workspaceId: string;
}

export interface BotConfig {
  companyName: string;
  agentName: string;
  presentation: string;
  mission: string;
  scope: string[];
  tone: 'formal' | 'profissional' | 'comercial' | 'consultivo';
  emojis: 'nao' | 'moderado' | 'livre';
  products: { name: string; price: string; description: string }[];
  qualificationQuestions: string[];
  closingData: string[];
  criticalRules: string[];
  tools: { name: string; description: string; enabled: boolean }[];
}

// Demo Workspaces
export const demoWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Fashion Brand Co.',
    niche: 'Moda & Vestuário',
    timezone: 'America/Sao_Paulo',
    status: 'active',
    instances: 2,
    leads: 156,
    conversions: 34,
    lastActivity: '2 min atrás',
    createdAt: '2024-01-15',
  },
  {
    id: 'ws-2',
    name: 'Clínica Estética Premium',
    niche: 'Saúde & Estética',
    timezone: 'America/Sao_Paulo',
    status: 'active',
    instances: 1,
    leads: 89,
    conversions: 23,
    lastActivity: '15 min atrás',
    createdAt: '2024-02-20',
  },
];

// Demo Instances
export const demoInstances: Instance[] = [
  {
    id: 'inst-1',
    name: 'botzap-fashion',
    phone: '+55 11 98765-4321',
    status: 'connected',
    lastPing: '30s atrás',
    events: 1247,
    messagesTotal: 8934,
    workspaceId: 'ws-1',
  },
  {
    id: 'inst-2',
    name: 'botzap-fashion-2',
    phone: '+55 11 91234-5678',
    status: 'disconnected',
    lastPing: '2h atrás',
    events: 0,
    messagesTotal: 3421,
    workspaceId: 'ws-1',
  },
  {
    id: 'inst-3',
    name: 'clinica-premium',
    phone: '+55 11 99876-5432',
    status: 'connected',
    lastPing: '1min atrás',
    events: 892,
    messagesTotal: 5672,
    workspaceId: 'ws-2',
  },
];

// Demo Leads
export const demoLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Maria Silva',
    phone: '+55 11 98888-1111',
    email: 'maria@email.com',
    stage: 'qualificando',
    source: 'Instagram',
    score: 85,
    lastMessage: 'Quero saber mais sobre o vestido preto',
    lastMessageAt: '5 min atrás',
    responsible: 'Ana Costa',
    needsFollowUp: false,
    converted: false,
    tags: ['VIP', 'Interessado'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-10',
  },
  {
    id: 'lead-2',
    name: 'João Santos',
    phone: '+55 11 97777-2222',
    stage: 'proposta',
    source: 'Facebook Ads',
    score: 92,
    lastMessage: 'Qual o valor do kit completo?',
    lastMessageAt: '15 min atrás',
    responsible: 'Carlos Mendes',
    needsFollowUp: true,
    converted: false,
    tags: ['Hot Lead'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-08',
  },
  {
    id: 'lead-3',
    name: 'Fernanda Lima',
    phone: '+55 11 96666-3333',
    stage: 'ganhou',
    source: 'Indicação',
    score: 100,
    lastMessage: 'Fechado! Vou fazer o pagamento agora',
    lastMessageAt: '1h atrás',
    needsFollowUp: false,
    converted: true,
    conversionDate: '2024-03-20',
    conversionValue: 2500,
    followUpSequence: 'Sequência 7 dias - Fashion',
    messagesUntilConversion: 12,
    tags: ['Convertido', 'VIP'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-01',
  },
  {
    id: 'lead-4',
    name: 'Pedro Alves',
    phone: '+55 11 95555-4444',
    stage: 'follow-up',
    source: 'Google Ads',
    score: 68,
    lastMessage: 'Vou pensar e te retorno',
    lastMessageAt: '2h atrás',
    responsible: 'Ana Costa',
    needsFollowUp: true,
    converted: false,
    tags: ['Indeciso'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-05',
  },
  {
    id: 'lead-5',
    name: 'Carla Souza',
    phone: '+55 11 94444-5555',
    stage: 'novo',
    source: 'Site',
    score: 45,
    lastMessage: 'Boa tarde, vi o anúncio de vocês',
    lastMessageAt: '30 min atrás',
    needsFollowUp: false,
    converted: false,
    tags: ['Novo'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-21',
  },
  {
    id: 'lead-6',
    name: 'Roberto Dias',
    phone: '+55 11 93333-6666',
    email: 'roberto@empresa.com',
    stage: 'ganhou',
    source: 'LinkedIn',
    score: 100,
    lastMessage: 'Contrato assinado!',
    lastMessageAt: '3h atrás',
    needsFollowUp: false,
    converted: true,
    conversionDate: '2024-03-19',
    conversionValue: 4800,
    followUpSequence: 'Sequência Corporate',
    messagesUntilConversion: 8,
    tags: ['Convertido', 'Corporativo'],
    workspaceId: 'ws-1',
    createdAt: '2024-02-28',
  },
  {
    id: 'lead-7',
    name: 'Amanda Gomes',
    phone: '+55 11 92222-7777',
    stage: 'perdido',
    source: 'Instagram',
    score: 20,
    lastMessage: 'Não tenho interesse no momento',
    lastMessageAt: '1d atrás',
    needsFollowUp: false,
    converted: false,
    tags: ['Perdido'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-02',
  },
  {
    id: 'lead-8',
    name: 'Lucas Martins',
    phone: '+55 11 91111-8888',
    stage: 'qualificando',
    source: 'WhatsApp Direto',
    score: 72,
    lastMessage: 'Vocês têm pronta entrega?',
    lastMessageAt: '45 min atrás',
    responsible: 'Carlos Mendes',
    needsFollowUp: false,
    converted: false,
    tags: ['Urgente'],
    workspaceId: 'ws-1',
    createdAt: '2024-03-18',
  },
  // Clínica Leads
  {
    id: 'lead-9',
    name: 'Patricia Oliveira',
    phone: '+55 11 98000-1234',
    email: 'patricia@email.com',
    stage: 'proposta',
    source: 'Google',
    score: 88,
    lastMessage: 'Qual o valor do procedimento?',
    lastMessageAt: '20 min atrás',
    responsible: 'Dra. Marina',
    needsFollowUp: true,
    converted: false,
    tags: ['Botox', 'Premium'],
    workspaceId: 'ws-2',
    createdAt: '2024-03-15',
  },
  {
    id: 'lead-10',
    name: 'Ricardo Fernandes',
    phone: '+55 11 97000-5678',
    stage: 'ganhou',
    source: 'Indicação',
    score: 100,
    lastMessage: 'Agendado para terça!',
    lastMessageAt: '4h atrás',
    needsFollowUp: false,
    converted: true,
    conversionDate: '2024-03-18',
    conversionValue: 3200,
    followUpSequence: 'Sequência 7 dias - Clínicas',
    messagesUntilConversion: 6,
    tags: ['Convertido', 'Harmonização'],
    workspaceId: 'ws-2',
    createdAt: '2024-03-10',
  },
];

// Generate more leads for a fuller experience
for (let i = 11; i <= 30; i++) {
  const stages: Lead['stage'][] = ['novo', 'qualificando', 'proposta', 'follow-up', 'ganhou', 'perdido'];
  const sources = ['Instagram', 'Facebook Ads', 'Google Ads', 'Site', 'Indicação', 'WhatsApp Direto'];
  const firstNames = ['Ana', 'Bruno', 'Clara', 'Daniel', 'Elena', 'Felipe', 'Gabriela', 'Hugo', 'Isabela', 'Jorge'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Rodrigues', 'Carvalho', 'Martins'];
  
  const stage = stages[Math.floor(Math.random() * stages.length)];
  const isConverted = stage === 'ganhou';
  
  demoLeads.push({
    id: `lead-${i}`,
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    phone: `+55 11 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    stage,
    source: sources[Math.floor(Math.random() * sources.length)],
    score: Math.floor(Math.random() * 60 + 40),
    lastMessage: 'Mensagem de exemplo...',
    lastMessageAt: `${Math.floor(Math.random() * 24)}h atrás`,
    needsFollowUp: Math.random() > 0.5,
    converted: isConverted,
    conversionDate: isConverted ? '2024-03-' + Math.floor(Math.random() * 20 + 1).toString().padStart(2, '0') : undefined,
    conversionValue: isConverted ? Math.floor(Math.random() * 5000 + 1000) : undefined,
    followUpSequence: isConverted ? 'Sequência Automática' : undefined,
    messagesUntilConversion: isConverted ? Math.floor(Math.random() * 15 + 5) : undefined,
    tags: [],
    workspaceId: Math.random() > 0.3 ? 'ws-1' : 'ws-2',
    createdAt: '2024-03-' + Math.floor(Math.random() * 21 + 1).toString().padStart(2, '0'),
  });
}

// Demo Conversations
export const demoConversations: Conversation[] = [
  {
    id: 'conv-1',
    leadId: 'lead-1',
    leadName: 'Maria Silva',
    leadPhone: '+55 11 98888-1111',
    lastMessage: 'Quero saber mais sobre o vestido preto',
    lastMessageAt: '5 min atrás',
    unread: 2,
    status: 'active',
    tags: ['VIP', 'Interessado'],
    workspaceId: 'ws-1',
    messages: [
      { id: 'm1', content: 'Olá! Vi o vestido preto no Instagram, ainda tem?', type: 'text', sender: 'user', timestamp: '14:30' },
      { id: 'm2', content: 'Olá Maria! 👋 Sim, temos o vestido preto disponível! É o modelo Elegance, certo?', type: 'text', sender: 'bot', timestamp: '14:30', status: 'read' },
      { id: 'm3', content: 'Isso mesmo! Qual o tamanho disponível?', type: 'text', sender: 'user', timestamp: '14:32' },
      { id: 'm4', content: 'Temos do P ao GG! Qual seria o seu tamanho?', type: 'text', sender: 'bot', timestamp: '14:32', status: 'read' },
      { id: 'm5', content: 'M seria perfeito. Qual o valor?', type: 'text', sender: 'user', timestamp: '14:35' },
      { id: 'm6', content: 'O vestido Elegance tamanho M está por R$ 389,00 à vista ou 3x de R$ 139,90. Posso reservar para você?', type: 'text', sender: 'bot', timestamp: '14:35', status: 'delivered' },
      { id: 'm7', content: 'Quero saber mais sobre o vestido preto', type: 'text', sender: 'user', timestamp: '14:38' },
    ],
  },
  {
    id: 'conv-2',
    leadId: 'lead-2',
    leadName: 'João Santos',
    leadPhone: '+55 11 97777-2222',
    lastMessage: 'Qual o valor do kit completo?',
    lastMessageAt: '15 min atrás',
    unread: 1,
    status: 'waiting',
    tags: ['Hot Lead'],
    workspaceId: 'ws-1',
    messages: [
      { id: 'm1', content: 'Boa tarde! Vocês fazem kit presente?', type: 'text', sender: 'user', timestamp: '13:45' },
      { id: 'm2', content: 'Boa tarde João! Sim, temos kits presenteáveis lindos! 🎁 Para quem seria o presente?', type: 'text', sender: 'bot', timestamp: '13:45', status: 'read' },
      { id: 'm3', content: 'Para minha esposa, aniversário de casamento', type: 'text', sender: 'user', timestamp: '13:48' },
      { id: 'm4', content: 'Que lindo! Parabéns pelo aniversário! 💕 Tenho opções incríveis para a ocasião. O Kit Romance tem vestido + bolsa + acessório por R$ 890.', type: 'text', sender: 'bot', timestamp: '13:48', status: 'read' },
      { id: 'm5', content: 'Qual o valor do kit completo?', type: 'text', sender: 'user', timestamp: '13:50' },
    ],
  },
  {
    id: 'conv-3',
    leadId: 'lead-5',
    leadName: 'Carla Souza',
    leadPhone: '+55 11 94444-5555',
    lastMessage: 'Boa tarde, vi o anúncio de vocês',
    lastMessageAt: '30 min atrás',
    unread: 0,
    status: 'active',
    tags: ['Novo'],
    workspaceId: 'ws-1',
    messages: [
      { id: 'm1', content: 'Boa tarde, vi o anúncio de vocês', type: 'text', sender: 'user', timestamp: '14:00' },
      { id: 'm2', content: 'Boa tarde Carla! 🌟 Seja bem-vinda! Qual anúncio chamou sua atenção?', type: 'text', sender: 'bot', timestamp: '14:00', status: 'read' },
    ],
  },
  {
    id: 'conv-4',
    leadId: 'lead-9',
    leadName: 'Patricia Oliveira',
    leadPhone: '+55 11 98000-1234',
    lastMessage: 'Qual o valor do procedimento?',
    lastMessageAt: '20 min atrás',
    unread: 1,
    status: 'waiting',
    tags: ['Botox', 'Premium'],
    workspaceId: 'ws-2',
    messages: [
      { id: 'm1', content: 'Olá, gostaria de saber sobre harmonização facial', type: 'text', sender: 'user', timestamp: '13:30' },
      { id: 'm2', content: 'Olá Patricia! 👩‍⚕️ A Clínica Premium oferece diversos procedimentos de harmonização. Você tem interesse em alguma área específica?', type: 'text', sender: 'bot', timestamp: '13:30', status: 'read' },
      { id: 'm3', content: 'Botox e preenchimento labial', type: 'text', sender: 'user', timestamp: '13:35' },
      { id: 'm4', content: 'Excelente escolha! Nossa Dra. Marina é especialista nesses procedimentos. Gostaria de agendar uma avaliação?', type: 'text', sender: 'bot', timestamp: '13:35', status: 'read' },
      { id: 'm5', content: 'Qual o valor do procedimento?', type: 'text', sender: 'user', timestamp: '13:40' },
    ],
  },
];

// Demo Follow-up Sequences
export const demoFollowUpSequences: FollowUpSequence[] = [
  {
    id: 'seq-1',
    name: 'Sequência 7 dias - Fashion',
    description: 'Sequência para leads de moda que não responderam',
    active: true,
    leadsEnrolled: 45,
    conversions: 12,
    workspaceId: 'ws-1',
    steps: [
      { id: 's1', day: 'D+0', message: 'Oi [NOME]! Vi que você se interessou pelo nosso [PRODUTO]. Ainda posso te ajudar?', objective: 'Reengajar', trigger: 'Sem resposta em 24h' },
      { id: 's2', day: 'D+1', message: 'Ei [NOME], temos uma condição especial hoje! Quer saber mais?', objective: 'Criar urgência', trigger: 'Sem resposta' },
      { id: 's3', day: 'D+3', message: '[NOME], nosso estoque está acabando! Reservo pra você?', objective: 'Escassez', trigger: 'Sem resposta' },
      { id: 's4', day: 'D+5', message: 'Última chance [NOME]! Frete grátis só até amanhã 🚚', objective: 'Oferta final', trigger: 'Sem resposta' },
      { id: 's5', day: 'D+7', message: 'Posso te ajudar com alguma dúvida, [NOME]? Estou aqui!', objective: 'Reconexão suave', trigger: 'Sem resposta' },
    ],
  },
  {
    id: 'seq-2',
    name: 'Sequência 7 dias - Clínicas',
    description: 'Follow-up para leads de clínicas estéticas',
    active: true,
    leadsEnrolled: 28,
    conversions: 8,
    workspaceId: 'ws-2',
    steps: [
      { id: 's1', day: 'D+0', message: 'Olá [NOME]! Ainda pensando na sua consulta? Posso esclarecer algo?', objective: 'Reengajar', trigger: 'Sem resposta em 48h' },
      { id: 's2', day: 'D+2', message: '[NOME], temos horários disponíveis essa semana! Qual seria melhor pra você?', objective: 'Facilitar agendamento', trigger: 'Sem resposta' },
      { id: 's3', day: 'D+4', message: 'Dica: a avaliação é gratuita e sem compromisso! Vamos agendar?', objective: 'Remover objeção', trigger: 'Sem resposta' },
      { id: 's4', day: 'D+7', message: 'Olá [NOME]! Ainda estou aqui se precisar de algo. Abraços! 💕', objective: 'Manter porta aberta', trigger: 'Sem resposta' },
    ],
  },
  {
    id: 'seq-3',
    name: 'Sequência Corporate',
    description: 'Follow-up para leads B2B',
    active: false,
    leadsEnrolled: 15,
    conversions: 5,
    workspaceId: 'ws-1',
    steps: [
      { id: 's1', day: 'D+0', message: 'Prezado(a) [NOME], gostaria de retomar nossa conversa sobre [PRODUTO].', objective: 'Formalizar contato', trigger: 'Sem resposta em 72h' },
      { id: 's2', day: 'D+3', message: 'Preparei uma proposta personalizada. Quando podemos agendar uma call?', objective: 'Proposta', trigger: 'Sem resposta' },
      { id: 's3', day: 'D+7', message: 'Ficamos à disposição para esclarecer quaisquer dúvidas.', objective: 'Disponibilidade', trigger: 'Sem resposta' },
    ],
  },
];

// Demo Conversions
export const demoConversions: ConversionRecord[] = [
  { id: 'c1', leadId: 'lead-3', leadName: 'Fernanda Lima', conversionDate: '2024-03-20', sequenceUsed: 'Sequência 7 dias - Fashion', messagesUntilConversion: 12, estimatedValue: 2500, workspaceId: 'ws-1' },
  { id: 'c2', leadId: 'lead-6', leadName: 'Roberto Dias', conversionDate: '2024-03-19', sequenceUsed: 'Sequência Corporate', messagesUntilConversion: 8, estimatedValue: 4800, workspaceId: 'ws-1' },
  { id: 'c3', leadId: 'lead-10', leadName: 'Ricardo Fernandes', conversionDate: '2024-03-18', sequenceUsed: 'Sequência 7 dias - Clínicas', messagesUntilConversion: 6, estimatedValue: 3200, workspaceId: 'ws-2' },
  { id: 'c4', leadId: 'lead-15', leadName: 'Clara Pereira', conversionDate: '2024-03-17', sequenceUsed: 'Sequência 7 dias - Fashion', messagesUntilConversion: 15, estimatedValue: 1890, workspaceId: 'ws-1' },
  { id: 'c5', leadId: 'lead-18', leadName: 'Bruno Almeida', conversionDate: '2024-03-15', sequenceUsed: 'Sequência 7 dias - Fashion', messagesUntilConversion: 9, estimatedValue: 3450, workspaceId: 'ws-1' },
  { id: 'c6', leadId: 'lead-22', leadName: 'Elena Costa', conversionDate: '2024-03-14', sequenceUsed: 'Sequência 7 dias - Clínicas', messagesUntilConversion: 11, estimatedValue: 2800, workspaceId: 'ws-2' },
  { id: 'c7', leadId: 'lead-25', leadName: 'Felipe Santos', conversionDate: '2024-03-12', sequenceUsed: 'Sequência Corporate', messagesUntilConversion: 7, estimatedValue: 5200, workspaceId: 'ws-1' },
  { id: 'c8', leadId: 'lead-28', leadName: 'Gabriela Martins', conversionDate: '2024-03-10', sequenceUsed: 'Sequência 7 dias - Fashion', messagesUntilConversion: 14, estimatedValue: 1650, workspaceId: 'ws-1' },
];

// Demo Bot Config
export const demoBotConfig: BotConfig = {
  companyName: 'Fashion Brand Co.',
  agentName: 'Sofia',
  presentation: 'Central de Vendas',
  mission: 'Atender clientes interessados em nossos produtos de moda, qualificar leads e direcionar para fechamento de vendas.',
  scope: ['qualificar', 'apresentar_precos', 'negociar', 'transferir'],
  tone: 'comercial',
  emojis: 'moderado',
  products: [
    { name: 'Vestido Elegance', price: 'R$ 389,00', description: 'Vestido preto midi, tecido premium' },
    { name: 'Kit Romance', price: 'R$ 890,00', description: 'Vestido + bolsa + acessório' },
    { name: 'Blazer Executive', price: 'R$ 459,00', description: 'Blazer alfaiataria, corte moderno' },
    { name: 'Calça Comfort', price: 'R$ 289,00', description: 'Calça social com elastano' },
  ],
  qualificationQuestions: [
    'Qual peça te interessou?',
    'Para qual ocasião você precisa?',
    'Qual seu tamanho?',
    'Tem preferência de cor?',
    'Conhece nossa marca?',
  ],
  closingData: ['nome', 'email', 'telefone', 'endereco', 'cpf'],
  criticalRules: [
    'Nunca inventar preços ou promoções',
    'Respeitar quando cliente pedir para parar',
    'Não prometer prazos de entrega específicos',
    'Transferir para humano se cliente insistir',
    'Não fazer promessas de resultado',
  ],
  tools: [
    { name: 'consultar_estoque', description: 'Verificar disponibilidade de produtos', enabled: true },
    { name: 'salvar_lead', description: 'Salvar dados do lead no CRM', enabled: true },
    { name: 'transferir_humano', description: 'Transferir conversa para atendente', enabled: true },
    { name: 'agendar_callback', description: 'Agendar retorno de ligação', enabled: true },
    { name: 'calcular_frete', description: 'Calcular frete por CEP', enabled: false },
    { name: 'aplicar_cupom', description: 'Validar e aplicar cupom de desconto', enabled: false },
  ],
};

// Chart data for Overview
export const chartData = {
  leadsVsConversions: [
    { week: 'Sem 1', leads: 45, conversions: 8 },
    { week: 'Sem 2', leads: 52, conversions: 12 },
    { week: 'Sem 3', leads: 38, conversions: 9 },
    { week: 'Sem 4', leads: 65, conversions: 15 },
  ],
  conversionsByWeek: [
    { week: 'Sem 1', conversions: 8, value: 12500 },
    { week: 'Sem 2', conversions: 12, value: 18900 },
    { week: 'Sem 3', conversions: 9, value: 14200 },
    { week: 'Sem 4', conversions: 15, value: 24800 },
  ],
};

// KPI data
export const kpiData = {
  totalMessages: 14892,
  activeLeads: 89,
  connectedInstances: 2,
  followUpConversions: 34,
  avgResponseTime: '2.3 min',
  totalConversions: 44,
  totalRevenue: 70400,
  avgTicket: 1600,
};

// Helper functions
export const getWorkspaceById = (id: string) => demoWorkspaces.find(w => w.id === id);
export const getLeadsByWorkspace = (workspaceId: string) => demoLeads.filter(l => l.workspaceId === workspaceId);
export const getConversationsByWorkspace = (workspaceId: string) => demoConversations.filter(c => c.workspaceId === workspaceId);
export const getInstancesByWorkspace = (workspaceId: string) => demoInstances.filter(i => i.workspaceId === workspaceId);
export const getConversionsByWorkspace = (workspaceId: string) => demoConversions.filter(c => c.workspaceId === workspaceId);
export const getSequencesByWorkspace = (workspaceId: string) => demoFollowUpSequences.filter(s => s.workspaceId === workspaceId);
