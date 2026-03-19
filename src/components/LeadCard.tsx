import { Lead } from "@/data/leads";
import { useLeads } from "@/contexts/LeadsContext";
import { MessageCircle, Calendar, Flame } from "lucide-react";
import { motion } from "framer-motion";

function getTemperature(lastInteraction: Date): { label: string; color: string; pulsing: boolean } {
  const hours = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
  if (hours < 2) return { label: "Quente", color: "bg-success text-primary-foreground", pulsing: false };
  if (hours < 12) return { label: "Morno", color: "bg-warning text-primary-foreground", pulsing: false };
  if (hours < 48) return { label: "Esfriando", color: "bg-danger/80 text-primary-foreground", pulsing: true };
  return { label: "Frio", color: "bg-danger text-primary-foreground", pulsing: true };
}

function ScoreFlames({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Flame
          key={i}
          className={`w-3.5 h-3.5 ${i < score ? "text-gold fill-gold" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function LeadCard({ lead }: { lead: Lead }) {
  const { attendLead } = useLeads();
  const temp = getTemperature(lead.lastInteraction);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-gold/10 hover:border-gold/30 transition-all duration-300 cursor-grab active:cursor-grabbing group"
      data-lead-id={lead.id}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">{lead.name}</h4>
          <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
            lead.originTag === "paid" ? "bg-gold/15 text-gold" : "bg-success/15 text-success"
          }`}>
            {lead.origin}
          </span>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${temp.color} ${temp.pulsing ? "animate-pulse-danger" : ""}`}>
          {temp.label}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Lead Score</span>
        <ScoreFlames score={lead.score} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          onClick={(e) => { e.stopPropagation(); attendLead(lead.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Atender
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Agendar
        </button>
      </div>
    </motion.div>
  );
}
