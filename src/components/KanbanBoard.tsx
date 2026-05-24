import { useEffect, useRef } from "react";
import Sortable from "sortablejs";
import { COLUMNS, useLeads } from "@/hooks/useLeads";
import LeadCard from "@/components/LeadCard";
import { motion } from "framer-motion";

export default function KanbanBoard() {
  const { filteredLeads, moveLead } = useLeads();
  const columnsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const sortablesRef = useRef<Sortable[]>([]);

  useEffect(() => {
    sortablesRef.current.forEach((s) => s.destroy());
    sortablesRef.current = [];

    COLUMNS.forEach((col) => {
      const el = columnsRef.current.get(col.id);
      if (!el) return;
      const sortable = Sortable.create(el, {
        group: "kanban", animation: 200, ghostClass: "opacity-30", handle: "[data-lead-id]",
        onEnd: (evt) => {
          const id = evt.item.getAttribute("data-lead-id");
          const to = evt.to.getAttribute("data-column") as any;
          if (id && to) moveLead(id, to);
        },
      });
      sortablesRef.current.push(sortable);
    });
    return () => { sortablesRef.current.forEach((s) => s.destroy()); };
  }, [filteredLeads, moveLead]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col, idx) => {
        const colLeads = filteredLeads.filter((l) => l.status === col.id);
        return (
          <motion.div key={col.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{col.emoji}</span>
                <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold">{colLeads.length}</span>
            </div>
            <div ref={(el) => { if (el) columnsRef.current.set(col.id, el); }} data-column={col.id}
              className="flex-1 space-y-3 min-h-[200px] p-2 rounded-xl bg-muted/50 border border-border/50">
              {colLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
              {colLeads.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">Arraste leads aqui</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
