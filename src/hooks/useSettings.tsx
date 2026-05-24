import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Settings {
  user_id: string;
  empresa_nome: string;
  logo_url: string | null;
  mensagem_padrao: string;
  webhook_token: string;
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSettings(null); setLoading(false); return; }
    let active = true;
    supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (active) { setSettings(data as Settings | null); setLoading(false); } });

    const ch = supabase.channel(`settings:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings", filter: `user_id=eq.${user.id}` },
        (p) => setSettings(p.new as Settings))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!user) return { error: new Error("not authenticated") };
    const { error } = await supabase.from("settings").update(patch).eq("user_id", user.id);
    return { error };
  }, [user]);

  return { settings, loading, updateSettings };
}
