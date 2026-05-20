import { createClient } from "@supabase/supabase-js";

// Lê as variáveis de ambiente. Se faltarem, NÃO quebra o app inteiro —
// o build fica de pé e as páginas que dependem de /api continuam funcionando.
// (Realtime e login Supabase precisam dessas chaves; sem elas, degradam.)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured && typeof console !== "undefined") {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — " +
      "login e realtime desativados até serem configurados."
  );
}

// Usa um placeholder válido (formato de URL) quando não configurado, para o
// createClient não lançar exceção no import e derrubar a aplicação inteira.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "oneeleven_auth",
    },
  }
);
