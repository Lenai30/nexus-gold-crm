import KanbanBoard from "@/components/KanbanBoard";

export default function Pipeline() {
  return (
    <div>
      <div className="mb-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <h1 className="text-2xl font-bold gradient-gold-text">Pipeline de Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">Arraste os cards entre as colunas para atualizar o status</p>
      </div>
      <KanbanBoard />
    </div>
  );
}
