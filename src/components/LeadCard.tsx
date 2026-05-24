import { Lead, useLeads } from "@/hooks/useLeads";
import { MessageCircle, Calendar, Flame, Trash2, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

function temperature(lastInteraction: string) {
  const hours = (Date.now() - new Date(lastInteraction).getTime()) / 3.6e6;
  if (hours < 2) return { label: "Quente", color: "bg-success text-primary-foreground", pulsing: false };
  if (hours < 12) return { label: "Morno", color: "bg-warning text-primary-foreground", pulsing: false };
  if (hours < 48) return { label: "Esfriando", color: "bg-danger/80 text-primary-foreground", pulsing: true };
  return { label: "Frio", color: "bg-danger text-primary-foreground", pulsing: true };
}

export default function LeadCard({ lead }: { lead: Lead }) {
  const { attendLead, deleteLead } = useLeads();
  const temp = temperature(lead.last_interaction);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card/95 border border-border rounded-2xl px-5 py-6 min-h-[220px] flex flex-col shadow-sm hover:shadow-gold hover:border-gold/40 transition-all duration-300 cursor-grab active:cursor-grabbing"
      data-lead-id={lead.id}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">{lead.nome}</h4>
          <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
            lead.origem_tag === "paid" ? "bg-gold/15 text-gold" : "bg-success/15 text-success"
          }`}>{lead.origem}</span>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${temp.color} ${temp.pulsing ? "animate-pulse" : ""}`}>{temp.label}</div>
      </div>

      {(lead.campanha_nome || lead.conjunto_nome || lead.anuncio_nome) && (
        <div className="mb-3 p-2.5 rounded-xl bg-gold/5 border border-gold/20">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gold uppercase tracking-wider mb-1">
            <Megaphone className="w-3 h-3" /> Campanha
          </div>
          <div className="space-y-0.5 text-[11px] text-foreground">
            {lead.campanha_nome && (
              <div className="font-medium truncate cursor-help" title={lead.campanha_nome}>
                📣 {lead.campanha_nome}
              </div>
            )}
            {lead.conjunto_nome && (
              <div className="text-muted-foreground truncate pl-3 cursor-help" title={lead.conjunto_nome}>
                ↳ {lead.conjunto_nome}
              </div>
            )}
            {lead.anuncio_nome && (
              <div className="text-muted-foreground truncate pl-3 cursor-help" title={lead.anuncio_nome}>
                🎯 {lead.anuncio_nome}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Lead Score</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Flame key={i} className={`w-3.5 h-3.5 ${i < lead.score ? "text-gold fill-gold" : "text-muted-foreground/30"}`} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-3 mt-auto border-t border-border">
        <button onClick={(e)=>{e.stopPropagation(); attendLead(lead.id);}}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors">
          <MessageCircle className="w-3.5 h-3.5" />Atender
        </button>
        <button onClick={(e)=>e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
          <Calendar className="w-3.5 h-3.5" />Agendar
        </button>
        <button onClick={(e)=>{e.stopPropagation(); if(confirm("Excluir lead?")) deleteLead(lead.id);}}
          className="flex items-center justify-center w-9 rounded-xl text-xs bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
