import { useState } from "react";
import { useLeads, COLUMNS } from "@/hooks/useLeads";
import { Lock, TrendingUp, Clock, Target, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

const PASSWORD = "nexus2026";

export default function Relatorios() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const { leads } = useLeads();

  const handleUnlock = () => {
    if (password === PASSWORD) { setUnlocked(true); setError(false); } else setError(true);
  };

  const chartData = COLUMNS.map((col) => ({ name: col.title, leads: leads.filter((l) => l.status === col.id).length }));
  const kpis = [
    { label: "ROI Estimado", value: "340%", icon: DollarSign, desc: "Retorno sobre investimento" },
    { label: "Tempo Médio de Resposta", value: "2.4h", icon: Clock, desc: "Primeiro contato" },
    { label: "Taxa de Conversão", value: "23%", icon: Target, desc: "Novos → Pós-Venda" },
    { label: "Crescimento Mensal", value: "+18%", icon: TrendingUp, desc: "vs. mês anterior" },
  ];

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="premium-card rounded-2xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gold" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Relatórios Premium</h2>
          <p className="text-sm text-muted-foreground mb-6">Insira a senha para acessar as métricas</p>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()} placeholder="Senha de acesso"
            className={`w-full px-4 py-2.5 rounded-lg bg-muted border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold mb-3 ${error ? "border-danger" : "border-border"}`} />
          {error && <p className="text-xs text-danger mb-3">Senha incorreta</p>}
          <button onClick={handleUnlock} className="w-full py-2.5 rounded-lg gradient-gold text-primary-foreground font-semibold text-sm hover:opacity-90">Desbloquear</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold gradient-gold-text">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Métricas e performance do funil</p>
        </div>
        <button onClick={() => { setUnlocked(false); setPassword(""); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" /> Bloquear
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="premium-card rounded-2xl p-5 hover:shadow-gold/10 hover:border-gold/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-3">
              <kpi.icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{kpi.value}</h3>
            <p className="text-xs font-medium text-foreground mt-1">{kpi.label}</p>
            <p className="text-[11px] text-muted-foreground">{kpi.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="premium-card rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-6">Leads por Etapa</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={`hsl(43, 74%, ${49 + i * 5}%)`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
