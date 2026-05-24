import { useLeads, COLUMNS } from "@/hooks/useLeads";
import { Users, TrendingUp, Clock, Flame, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { leads, loading } = useLeads();
  const today = new Date(); today.setHours(0,0,0,0);
  const followupsHoje = leads.filter(l => l.prox_acao && new Date(l.prox_acao) <= new Date()).length;

  const stats = [
    { label: "Total de Leads", value: leads.length, icon: Users, change: "+12%" },
    { label: "Em Negociação", value: leads.filter((l) => l.status === "negociacao").length, icon: TrendingUp, change: "+8%" },
    { label: "Follow-ups Hoje", value: followupsHoje, icon: Clock, change: "pendentes" },
    { label: "Leads Quentes", value: leads.filter((l) => l.score >= 4).length, icon: Flame, change: "Alta prioridade" },
  ];

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <h1 className="text-2xl font-bold gradient-gold-text">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumo geral do seu funil de vendas</p>
      </div>
      {loading && <p className="mb-4 text-sm text-muted-foreground">Carregando dados do CRM...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="premium-card rounded-2xl p-5 hover:shadow-gold/10 hover:border-gold/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-gold" />
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                <ArrowUpRight className="w-3 h-3" />{stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="premium-card rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Funil de Vendas</h2>
        <div className="space-y-3">
          {COLUMNS.map((col) => {
            const count = leads.filter((l) => l.status === col.id).length;
            const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
            return (
              <div key={col.id} className="flex items-center gap-4">
                <span className="text-lg w-6">{col.emoji}</span>
                <span className="text-sm font-medium text-foreground w-32">{col.title}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 }}
                    className="h-full gradient-gold rounded-full" />
                </div>
                <span className="text-sm font-bold text-gold w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
