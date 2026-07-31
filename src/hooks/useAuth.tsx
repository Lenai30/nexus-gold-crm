import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, isAdmin: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(data?.role === "admin");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession((prev) => {
        // Avoid re-renders (and child re-mounts / flicker) when only the token refreshes silently
        if (prev?.user?.id === s?.user?.id && prev?.access_token === s?.access_token) return prev;
        return s;
      });
      if (s?.user) {
        setTimeout(() => checkAdmin(s.user.id), 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          // Sessão local corrompida/expirada: limpa e volta ao login sem travar a tela
          try { await supabase.auth.signOut({ scope: "local" }); } catch { /* ignore */ }
          setSession(null);
          setLoading(false);
          return;
        }
        setSession(session);
        setLoading(false);
        if (session?.user) {
          checkAdmin(session.user.id);
        }
      })
      .catch(async () => {
        try { await supabase.auth.signOut({ scope: "local" }); } catch { /* ignore */ }
        setSession(null);
        setLoading(false);
      });


    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      isAdmin,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
