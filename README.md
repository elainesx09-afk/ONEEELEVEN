# ONE ELEVEN - Dashboard Demo

Este é um dashboard funcional para WhatsApp + IA + CRM, pronto para deploy na Vercel.

## ✅ O que está incluído

- ✅ **Dashboard completo** com todas as páginas funcionando
- ✅ **Dados de demonstração** (mock data)
- ✅ **UI moderna** com Shadcn/UI e Tailwind
- ✅ **Sem autenticação** - acesso direto ao dashboard
- ✅ **Configuração Vercel** pronta

## 🚀 Deploy na Vercel

### Método 1: Via Git (Recomendado)

1. Crie um repositório Git e faça push deste código
2. Conecte o repositório na Vercel
3. A Vercel detecta Vite automaticamente
4. Deploy! 🎉

### Método 2: Via CLI

```bash
npm install -g vercel
cd oneeleven-funcional-vercel
vercel
```

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes React e UI
├── contexts/       # Contextos (WorkspaceContext)
├── data/          # Dados de demonstração (demoData.ts)
├── hooks/         # React hooks customizados
├── lib/           # Utilitários
├── pages/         # Páginas do dashboard
│   ├── Overview.tsx
│   ├── Clients.tsx
│   ├── Instances.tsx
│   ├── Inbox.tsx
│   ├── Leads.tsx
│   ├── Pipeline.tsx
│   ├── FollowUps.tsx
│   ├── Converted.tsx
│   ├── Bot.tsx
│   └── Settings.tsx
├── App.tsx        # Componente principal
└── main.tsx       # Entry point
```

## 🎨 Páginas Disponíveis

- `/overview` - Dashboard principal (rota padrão)
- `/clients` - Gestão de clientes
- `/instances` - Instâncias do WhatsApp
- `/inbox` - Caixa de entrada
- `/leads` - Gestão de leads
- `/pipeline` - Pipeline de vendas
- `/follow-ups` - Follow-ups
- `/converted` - Conversões
- `/bot` - Configuração do bot
- `/settings` - Configurações

## ⚙️ Configuração

Este projeto **NÃO requer variáveis de ambiente** porque usa dados de demonstração.

### Se você quiser conectar dados reais:

1. Edite `src/data/demoData.ts` para usar uma API real
2. Ou configure Supabase/Firebase/outro backend
3. Adicione as variáveis de ambiente necessárias

## 🔧 Tecnologias Utilizadas

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Componentes UI
- **React Router** - Navegação
- **Recharts** - Gráficos
- **Lucide React** - Ícones

## 📝 Notas Importantes

- ✅ **Sem autenticação** - Para demo/preview apenas
- ✅ **Dados mock** - Todos os dados são de demonstração
- ✅ **SPA routing** - vercel.json configurado corretamente
- ✅ **Sem dependências do Lovable** - Pronto para produção

## 🐛 Resolução de Problemas

### Tela preta após deploy?

1. Verifique Build Logs na Vercel
2. Confirme que o build completou sem erros
3. Verifique o Console do navegador (F12)
4. Certifique-se que vercel.json está incluído no deploy

### Build falha?

```bash
# Limpe e reinstale
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Assets não carregam?

- Verifique se `/public` está incluído no deploy
- Assets devem estar em `/public/` (não `/src/`)

## 📞 Próximos Passos

Para transformar em produção:

1. **Adicionar autenticação** (Supabase, Auth0, etc)
2. **Conectar API real** para dados
3. **Configurar workspace real** (remover mock)
4. **Adicionar analytics** (Google Analytics, Plausible, etc)
5. **Configurar domínio customizado** na Vercel

## 📄 Licença

Projeto criado via Lovable e adaptado para produção na Vercel.

---

**Deploy com confiança! Este código está pronto para produção.** 🚀
