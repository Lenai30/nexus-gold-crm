import { useLeads } from "@/contexts/LeadsContext";
import { CalendarClock, MessageCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

export default function FollowUp() {
  const { leads, attendLead } = useLeads();
  const followUpLeads = leads
    .filter((l) => l.column === "followup" || l.followUpDate)
    .sort((a, b) => {
      const dateA = a.followUpDate?.getTime() || a.lastInteraction.getTime();
      const dateB = b.followUpDate?.getTime() || b.lastInteraction.getTime();
      return dateA - dateB;
    });

  const isOverdue = (lead: typeof followUpLeads[0]) => {
    if (lead.followUpDate) return lead.followUpDate < new Date();
    return (Date.now() - lead.lastInteraction.getTime()) > 48 * 60 * 60 * 1000;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold gradient-gold-text">Agenda de Follow-up</h1>
        <p className="text-sm text-muted-foreground mt-1">Leads que precisam de retorno</p>
      </div>

      <div className="space-y-3">
        {followUpLeads.map((lead, i) => {
          const overdue = isOverdue(lead);
          return (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 bg-card border rounded-xl p-4 transition-all ${
                overdue ? "border-danger/50 shadow-sm" : "border-border hover:border-gold/30"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                overdue ? "bg-danger/10" : "bg-gold/10"
              }`}>
                {overdue ? (
                  <AlertTriangle className="w-5 h-5 text-danger animate-pulse-danger" />
                ) : (
                  <CalendarClock className="w-5 h-5 text-gold" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{lead.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lead.followUpDate
                    ? `Agendado: ${format(lead.followUpDate, "dd MMM, HH:mm", { locale: ptBR })}`
                    : `Último contato: ${format(lead.lastInteraction, "dd MMM, HH:mm", { locale: ptBR })}`
                  }
                </p>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                lead.originTag === "paid" ? "bg-gold/15 text-gold" : "bg-success/15 text-success"
              }`}>
                {lead.originTag === "paid" ? "Ads" : "Orgânico"}
              </span>

              <button
                onClick={() => attendLead(lead.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Atender
              </button>
            </motion.div>
          );
        })}

        {followUpLeads.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum follow-up pendente</p>
          </div>
        )}
      </div>
    </div>
  );
}
