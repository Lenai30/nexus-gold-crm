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
    setLoading(true);

    const ensureSettings = async () => {
      const { data, error } = await supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle();
      if (!active) return;

      if (error) {
        setSettings(null);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings(data as Settings);
        setLoading(false);
        return;
      }

      const { data: created } = await supabase
        .from("settings")
        .insert({ user_id: user.id, empresa_nome: "Nexus CRM" })
        .select("*")
        .maybeSingle();

      if (active) {
        setSettings(created as Settings | null);
        setLoading(false);
      }
    };

    ensureSettings();

    const channelTopic = `settings:${user.id}:${crypto.randomUUID()}`;
    const ch = supabase.channel(channelTopic)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings", filter: `user_id=eq.${user.id}` },
        (p) => {
          if (p.eventType === "DELETE") setSettings(null);
          else setSettings(p.new as Settings);
        })
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
