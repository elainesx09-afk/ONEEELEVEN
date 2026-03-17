# Debug de Autenticação

## Passos para Testar Autenticação

1. **Abrir DevTools** (F12)
2. **Console → Execute este código:**
   ```javascript
   // Limpar todo o localStorage
   localStorage.clear()
   // Limpar sessionStorage  
   sessionStorage.clear()
   // Limpar cookies Supabase
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   })
   console.log("✅ Sessão limpa!")
   // Reload
   window.location.href = '/follow-ups'
   ```

3. **Resultado Esperado:**
   - Page redireciona para `/login`
   - Mostra formulário de login
   - Sem passar por `/follow-ups`

4. **Se não funcionar:**
   - Verificar console por erros
   - Verificar Network tab durante redirect
   - Verificar se VITE_SUPABASE_URL está configurada no Vercel

## Variaveis de Ambiente Necessárias no Vercel

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=https://oneeeleven.vercel.app/api
VITE_DEMO_MODE=false
```

## Checklist

- [ ] VITE_DEMO_MODE=false em produção?
- [ ] VITE_SUPABASE_URL OK?
- [ ] Cache do browser limpo?
- [ ] localhost vs production URL?

