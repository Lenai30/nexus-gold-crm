import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Lead {
  id: string;
  user_id: string;
  nome: string;
  whatsapp: string;
  origem: string;
  origem_tag: "paid" | "organic";
  score: number;
  status: "novos" | "negociacao" | "followup" | "posvenda";
  notas: string | null;
  prox_acao: string | null;
  nascimento: string | null;
  campanha_id: string | null;
  campanha_nome: string | null;
  conjunto_nome: string | null;
  anuncio_nome: string | null;
  last_interaction: string;
  created_at: string;
}

export const COLUMNS = [
  { id: "novos" as const, title: "Novos", emoji: "✨" },
  { id: "negociacao" as const, title: "Em Negociação", emoji: "🤝" },
  { id: "followup" as const, title: "Follow-up", emoji: "📞" },
  { id: "posvenda" as const, title: "Pós-Venda", emoji: "🎯" },
];

interface Ctx {
  leads: Lead[];
  loading: boolean;
  filteredLeads: Lead[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  originFilter: "all" | "paid" | "organic";
  setOriginFilter: (f: "all" | "paid" | "organic") => void;
  moveLead: (id: string, status: Lead["status"]) => Promise<void>;
  attendLead: (id: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  createLead: (lead: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
}

const LeadsCtx = createContext<Ctx | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "paid" | "organic">("all");

  useEffect(() => {
    if (!user) { setLeads([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    supabase.from("leads").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error("Erro ao carregar leads: " + error.message);
        setLeads((data || []) as Lead[]);
        setLoading(false);
      });

    const channelTopic = `leads:${user.id}:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelTopic)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setLeads((curr) => {
            if (payload.eventType === "INSERT") return [payload.new as Lead, ...curr];
            if (payload.eventType === "UPDATE") return curr.map(l => l.id === (payload.new as Lead).id ? payload.new as Lead : l);
            if (payload.eventType === "DELETE") return curr.filter(l => l.id !== (payload.old as Lead).id);
            return curr;
          });
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  const moveLead = useCallback(async (id: string, status: Lead["status"]) => {
    setLeads((curr) => curr.map((lead) => lead.id === id ? { ...lead, status, last_interaction: new Date().toISOString() } : lead));
    const { error } = await supabase.from("leads")
      .update({ status, last_interaction: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const attendLead = useCallback(async (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const phone = lead.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${lead.nome}!`)}`, "_blank");
    await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", id);
  }, [leads]);

  const deleteLead = useCallback(async (id: string) => {
    const previous = leads;
    setLeads((curr) => curr.filter(l => l.id !== id));
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { setLeads(previous); toast.error(error.message); } else toast.success("Lead removido");
  }, [leads]);

  const createLead = useCallback(async (lead: Partial<Lead>) => {
    if (!user) return;
    const payload = {
      ...lead,
      user_id: user.id,
      nome: (lead.nome || "").trim(),
      whatsapp: (lead.whatsapp || "").trim(),
      origem: lead.origem || "Manual",
      origem_tag: lead.origem_tag || "organic",
      status: lead.status || "novos",
      score: Math.min(5, Math.max(1, Number(lead.score) || 3)),
    } as any;
    const { error } = await supabase.from("leads").insert(payload);
    if (error) toast.error(error.message); else toast.success("Lead criado");
  }, [user]);

  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const filteredLeads = useMemo(() => leads.filter(l => {
    const m = !searchQuery || l.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.origem || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.campanha_nome || "").toLowerCase().includes(searchQuery.toLowerCase());
    const o = originFilter === "all" || l.origem_tag === originFilter;
    return m && o;
  }), [leads, searchQuery, originFilter]);

  return (
    <LeadsCtx.Provider value={{ leads, loading, filteredLeads, searchQuery, setSearchQuery, originFilter, setOriginFilter, moveLead, attendLead, deleteLead, createLead, updateLead }}>
      {children}
    </LeadsCtx.Provider>
  );
}

export const useLeads = () => {
  const c = useContext(LeadsCtx);
  if (!c) throw new Error("useLeads must be inside LeadsProvider");
  return c;
};
