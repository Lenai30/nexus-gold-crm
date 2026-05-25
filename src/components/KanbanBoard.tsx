import { useCallback, useEffect, useRef } from "react";
import Sortable from "sortablejs";
import { COLUMNS, useLeads } from "@/hooks/useLeads";
import LeadCard from "@/components/LeadCard";
import { motion } from "framer-motion";

export default function KanbanBoard() {
  const { filteredLeads, moveLead, loading } = useLeads();
  const sortablesRef = useRef<Map<string, Sortable>>(new Map());

  const attachColumn = useCallback((colId: string) => (el: HTMLDivElement | null) => {
    const existing = sortablesRef.current.get(colId);
    if (!el) {
      if (existing) {
        try { existing.destroy(); } catch {}
        sortablesRef.current.delete(colId);
      }
      return;
    }
    if (existing) return; // already initialized
    const s = Sortable.create(el, {
      group: "kanban",
      animation: 200,
      ghostClass: "opacity-30",
      handle: "[data-lead-id]",
      onEnd: (evt) => {
        const id = evt.item.getAttribute("data-lead-id");
        const to = (evt.to as HTMLElement).getAttribute("data-column") as any;
        // Reverte a movimentação física do DOM feita pelo SortableJS
        // para evitar conflito com o React (erro removeChild).
        // O React vai re-renderizar com o novo status na coluna correta.
        try {
          const from = evt.from as HTMLElement;
          const oldIndex = evt.oldIndex ?? 0;
          const ref = from.children[oldIndex] || null;
          from.insertBefore(evt.item, ref);
        } catch {}
        if (id && to) moveLead(id, to);
      },
    });
    sortablesRef.current.set(colId, s);
  }, [moveLead]);

  useEffect(() => {
    return () => {
      sortablesRef.current.forEach((s) => { try { s.destroy(); } catch {} });
      sortablesRef.current.clear();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col, idx) => {
        const colLeads = filteredLeads.filter((l) => l.status === col.id);
        return (
          <motion.div key={col.id} initial={false} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{col.emoji}</span>
                <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold">{colLeads.length}</span>
            </div>
            <div ref={attachColumn(col.id)} data-column={col.id}
              className="flex-1 space-y-3 min-h-[260px] p-3 rounded-2xl bg-muted/45 border border-border/70 shadow-inner">
              {colLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
              {colLeads.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">{loading ? "Carregando..." : "Arraste leads aqui"}</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
