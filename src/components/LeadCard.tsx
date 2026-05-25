import { useState } from "react";
import { Lead, useLeads } from "@/hooks/useLeads";
import { MessageCircle, Calendar, Flame, Trash2, Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ChatDrawer from "./ChatDrawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function toLocalInput(iso: string | null) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function temperature(lastInteraction: string) {
  const hours = (Date.now() - new Date(lastInteraction).getTime()) / 3.6e6;
  if (hours < 2) return { label: "Quente", color: "bg-success text-primary-foreground", pulsing: false };
  if (hours < 12) return { label: "Morno", color: "bg-warning text-primary-foreground", pulsing: false };
  if (hours < 48) return { label: "Esfriando", color: "bg-danger/80 text-primary-foreground", pulsing: true };
  return { label: "Frio", color: "bg-danger text-primary-foreground", pulsing: true };
}

export default function LeadCard({ lead }: { lead: Lead }) {
  const { deleteLead, updateLead } = useLeads();
  const temp = temperature(lead.last_interaction);
  const [chatOpen, setChatOpen] = useState(false);
  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agendarDate, setAgendarDate] = useState(toLocalInput(lead.prox_acao));
  const [agendarNota, setAgendarNota] = useState(lead.notas || "");
  const [salvando, setSalvando] = useState(false);

  const openAgendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAgendarDate(toLocalInput(lead.prox_acao));
    setAgendarNota(lead.notas || "");
    setAgendarOpen(true);
  };

  const confirmarAgendar = async () => {
    const date = new Date(agendarDate);
    if (isNaN(date.getTime())) { toast.error("Data inválida"); return; }
    setSalvando(true);
    await updateLead(lead.id, { prox_acao: date.toISOString(), notas: agendarNota || null } as any);
    setSalvando(false);
    setAgendarOpen(false);
    toast.success(`Agendado para ${date.toLocaleString("pt-BR")}`);
  };

  return (
    <div
      className="bg-card/95 border border-border rounded-2xl px-4 py-3.5 flex flex-col shadow-sm hover:shadow-gold hover:border-gold/40 transition-all duration-300 cursor-grab active:cursor-grabbing"
      data-lead-id={lead.id}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate" title={lead.nome}>{lead.nome}</h4>
          <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
            lead.origem_tag === "paid" ? "bg-gold/15 text-gold" : "bg-success/15 text-success"
          }`}>{lead.origem}</span>
        </div>
        <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${temp.color} ${temp.pulsing ? "animate-pulse" : ""}`}>{temp.label}</div>
      </div>

      {(lead.campanha_nome || lead.conjunto_nome || lead.anuncio_nome) && (
        <div className="mb-2.5 px-2.5 py-2 rounded-xl bg-gold/5 border border-gold/20">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-gold uppercase tracking-wider mb-1">
            <Megaphone className="w-3 h-3" /> Campanha
          </div>
          <div className="space-y-0.5 text-[11px] text-foreground leading-snug">
            {lead.campanha_nome && (
              <div className="font-medium truncate cursor-help" title={lead.campanha_nome}>📣 {lead.campanha_nome}</div>
            )}
            {lead.conjunto_nome && (
              <div className="text-muted-foreground truncate pl-3 cursor-help" title={lead.conjunto_nome}>↳ {lead.conjunto_nome}</div>
            )}
            {lead.anuncio_nome && (
              <div className="text-muted-foreground truncate pl-3 cursor-help" title={lead.anuncio_nome}>🎯 {lead.anuncio_nome}</div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Score</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Flame key={i} className={`w-3.5 h-3.5 ${i < lead.score ? "text-gold fill-gold" : "text-muted-foreground/30"}`} />
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 pt-2.5 mt-auto border-t border-border">
        <button onClick={(e)=>{e.stopPropagation(); setChatOpen(true);}}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium bg-success/10 text-success hover:bg-success/20 transition-colors">
          <MessageCircle className="w-3.5 h-3.5" />Atender
        </button>
        <button onClick={openAgendar}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
          <Calendar className="w-3.5 h-3.5" />Agendar
        </button>
        <button onClick={(e)=>{e.stopPropagation(); if(confirm("Excluir lead?")) deleteLead(lead.id);}}
          className="flex items-center justify-center w-8 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {chatOpen && <ChatDrawer lead={lead} open={chatOpen} onOpenChange={setChatOpen} />}

      <Dialog open={agendarOpen} onOpenChange={setAgendarOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="gradient-gold-text">Agendar Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Lead: <span className="text-foreground font-medium">{lead.nome}</span></div>
            <div>
              <Label className="mb-1.5 block">Data e Hora</Label>
              <Input type="datetime-local" value={agendarDate} onChange={(e) => setAgendarDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea placeholder="Motivo do follow-up..." value={agendarNota} onChange={(e) => setAgendarNota(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgendarOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarAgendar} disabled={salvando} className="gradient-gold text-primary-foreground">
              {salvando ? "Salvando..." : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
