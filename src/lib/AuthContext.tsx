import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { setTenant, clearTenant } from "@/lib/tenant";

export type UserProfile = {
  id: string;
  email: string;
  full_name?: string | null;
  workspace_id: string;
  role: "owner" | "admin" | "member";
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string, userEmail: string) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name, workspace_id, role")
        .eq("id", userId)
        .single();

      if (error || !data) return null;

      const p: UserProfile = {
        id: data.id,
        email: userEmail,
        full_name: data.full_name,
        workspace_id: data.workspace_id,
        role: data.role ?? "member",
      };

      setTenant({ workspaceId: p.workspace_id });
      return p;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (s?.user) {
        setSession(s);
        setUser(s.user);
        const p = await loadProfile(s.user.id, s.user.email ?? "");
        if (mounted) setProfile(p);
      }
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && s?.user) {
        setSession(s);
        setUser(s.user);
        const p = await loadProfile(s.user.id, s.user.email ?? "");
        if (mounted) setProfile(p);
        setLoading(false);
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        clearTenant();
        setLoading(false);
      }

      if (event === "TOKEN_REFRESHED" && s?.user) {
        setSession(s);
        setUser(s.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const msgs: Record<string, string> = {
        "Invalid login credentials": "E-mail ou senha incorretos.",
        "Email not confirmed": "Confirme seu e-mail antes de entrar.",
        "Too many requests": "Muitas tentativas. Aguarde um momento.",
      };
      return { error: msgs[error.message] ?? error.message };
    }

    if (!data.user) return { error: "Usuário não encontrado." };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearTenant();
    localStorage.removeItem("oneeleven_workspace_id");
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
