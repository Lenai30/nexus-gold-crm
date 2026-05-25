import { useEffect, useMemo, useRef, useState } from "react";
import { useLeads, COLUMNS } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Lock, TrendingUp, Clock, Target, Trophy, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PASSWORD = "nexus2026";

function formatDuration(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "—";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export default function Relatorios() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [avgResponseMs, setAvgResponseMs] = useState<number | null>(null);
  const { leads } = useLeads();
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  // --- Métricas reais a partir dos leads ---
  const metrics = useMemo(() => {
    const total = leads.length;
    const convertidos = leads.filter(l => l.status === "posvenda").length;
    const taxaConv = total > 0 ? (convertidos / total) * 100 : 0;

    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLast = startThis;
    const thisMonth = leads.filter(l => new Date(l.created_at) >= startThis).length;
    const lastMonth = leads.filter(l => {
      const d = new Date(l.created_at);
      return d >= startLast && d < endLast;
    }).length;
    const crescimento = lastMonth > 0
      ? ((thisMonth - lastMonth) / lastMonth) * 100
      : (thisMonth > 0 ? 100 : 0);

    return { total, convertidos, taxaConv, thisMonth, lastMonth, crescimento };
  }, [leads]);

  // --- Tempo médio de resposta a partir da tabela messages ---
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("messages")
        .select("lead_id, direction, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (!active || !data) return;
      const byLead = new Map<string, { in?: string; outAfter?: string }>();
      for (const m of data as any[]) {
        if (!m.lead_id) continue;
        const cur = byLead.get(m.lead_id) || {};
        if (m.direction === "in" && !cur.in) cur.in = m.created_at;
        else if (m.direction === "out" && cur.in && !cur.outAfter) cur.outAfter = m.created_at;
        byLead.set(m.lead_id, cur);
      }
      const diffs: number[] = [];
      byLead.forEach(v => {
        if (v.in && v.outAfter) diffs.push(new Date(v.outAfter).getTime() - new Date(v.in).getTime());
      });
      const avg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
      setAvgResponseMs(avg);
    })();
    return () => { active = false; };
  }, [user]);

  const chartData = COLUMNS.map((col) => ({ name: col.title, leads: leads.filter((l) => l.status === col.id).length }));

  const kpis = [
    {
      label: "Leads Convertidos",
      value: String(metrics.convertidos),
      icon: Trophy,
      desc: `${metrics.total} leads no total`,
    },
    {
      label: "Tempo Médio de Resposta",
      value: avgResponseMs === null ? "..." : formatDuration(avgResponseMs),
      icon: Clock,
      desc: "Primeiro contato → resposta",
    },
    {
      label: "Taxa de Conversão",
      value: `${metrics.taxaConv.toFixed(1)}%`,
      icon: Target,
      desc: "Novos → Pós-Venda",
    },
    {
      label: "Crescimento Mensal",
      value: `${metrics.crescimento >= 0 ? "+" : ""}${metrics.crescimento.toFixed(1)}%`,
      icon: TrendingUp,
      desc: `${metrics.thisMonth} este mês · ${metrics.lastMonth} anterior`,
    },
  ];

  const handleUnlock = () => {
    if (password === PASSWORD) { setUnlocked(true); setError(false); } else setError(true);
  };

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const node = reportRef.current;
      const canvas = await html2canvas(node, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 20;
      if (imgHeight <= pageHeight - 40) {
        pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
      } else {
        // Múltiplas páginas
        let remaining = imgHeight;
        let offset = 0;
        const pageContentHeight = pageHeight - 40;
        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 20, 20 - offset, imgWidth, imgHeight);
          remaining -= pageContentHeight;
          offset += pageContentHeight;
          if (remaining > 0) pdf.addPage();
        }
      }
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      pdf.save(`relatorio-${stamp}.pdf`);
      toast.success("Relatório PDF gerado");
    } catch (e: any) {
      toast.error("Falha ao gerar PDF: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  };

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

  const periodo = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold gradient-gold-text">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Métricas reais do seu CRM — {periodo}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-3 py-2 rounded-lg gradient-gold text-primary-foreground font-semibold text-xs hover:opacity-90 flex items-center gap-1.5 disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Gerando..." : "Baixar PDF"}
          </button>
          <button onClick={() => { setUnlocked(false); setPassword(""); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Bloquear
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={`hsl(43, 74%, ${49 + i * 5}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="premium-card rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Resumo Mensal</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground text-xs">Leads no mês</p><p className="text-xl font-bold text-foreground">{metrics.thisMonth}</p></div>
            <div><p className="text-muted-foreground text-xs">Mês anterior</p><p className="text-xl font-bold text-foreground">{metrics.lastMonth}</p></div>
            <div><p className="text-muted-foreground text-xs">Convertidos</p><p className="text-xl font-bold text-foreground">{metrics.convertidos}</p></div>
            <div><p className="text-muted-foreground text-xs">Total geral</p><p className="text-xl font-bold text-foreground">{metrics.total}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
