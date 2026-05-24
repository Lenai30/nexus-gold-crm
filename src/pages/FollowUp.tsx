import { useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, MessageCircle, AlertTriangle, Cake, Phone, Send, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function FollowUp() {
  const { leads, attendLead } = useLeads();
  const { user } = useAuth();

  // Agenda
  const agenda = leads
    .filter(l => l.status === "followup" || l.prox_acao)
    .sort((a,b) => {
      const da = a.prox_acao ? new Date(a.prox_acao).getTime() : new Date(a.last_interaction).getTime();
      const db = b.prox_acao ? new Date(b.prox_acao).getTime() : new Date(b.last_interaction).getTime();
      return da - db;
    });
  const overdue = (l: typeof leads[0]) => l.prox_acao ? new Date(l.prox_acao) < new Date()
    : (Date.now() - new Date(l.last_interaction).getTime()) > 48 * 3.6e6;

  // Aniversariantes (mês atual)
  const mesAtual = new Date().getMonth();
  const aniversariantes = leads.filter(l => l.nascimento && new Date(l.nascimento + "T00:00:00").getMonth() === mesAtual);

  // Campanha manual
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mensagem, setMensagem] = useState("Olá {nome}! Temos uma oferta especial...");
  const [imagemUrl, setImagemUrl] = useState("");
  const toggleAll = (on: boolean) => setSelected(on ? new Set(leads.map(l => l.id)) : new Set());
  const toggleOne = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s);
  };

  const disparar = async () => {
    if (!user || selected.size === 0) { toast.error("Selecione ao menos um lead"); return; }
    const alvos = leads.filter(l => selected.has(l.id));
    alvos.forEach((l, i) => {
      setTimeout(() => {
        const msg = mensagem.replaceAll("{nome}", l.nome);
        const phone = l.whatsapp.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg + (imagemUrl ? "\n\n" + imagemUrl : ""))}`, "_blank");
      }, i * 800);
    });
    await supabase.from("campanhas_log").insert({ user_id: user.id, mensagem, qtd_leads: alvos.length });
    toast.success(`Campanha disparada para ${alvos.length} leads`);
    setSelected(new Set());
  };

  const parabenizar = (lead: typeof leads[0]) => {
    const phone = lead.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`🎉 Parabéns ${lead.nome}! Desejamos um feliz aniversário!`)}`, "_blank");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold gradient-gold-text">Follow-up & Campanhas</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie retornos, aniversariantes e dispare campanhas</p>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="mb-6">
          <TabsTrigger value="agenda"><CalendarClock className="w-4 h-4 mr-2" />Agenda</TabsTrigger>
          <TabsTrigger value="aniversariantes"><Cake className="w-4 h-4 mr-2" />Aniversariantes</TabsTrigger>
          <TabsTrigger value="campanha"><Send className="w-4 h-4 mr-2" />Campanha Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-3">
          {agenda.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tudo em dia! Nenhum follow-up pendente</p>
            </div>
          )}
          {agenda.map((lead, i) => {
            const od = overdue(lead);
            return (
              <motion.div key={lead.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 bg-card border rounded-xl p-4 ${od ? "border-danger/50" : "border-border hover:border-gold/30"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${od ? "bg-danger/10" : "bg-gold/10"}`}>
                  {od ? <AlertTriangle className="w-5 h-5 text-danger animate-pulse" /> : <CalendarClock className="w-5 h-5 text-gold" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{lead.nome}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lead.prox_acao
                      ? `Agendado: ${format(new Date(lead.prox_acao), "dd MMM, HH:mm", { locale: ptBR })}`
                      : `Último contato: ${format(new Date(lead.last_interaction), "dd MMM, HH:mm", { locale: ptBR })}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => attendLead(lead.id)} className="text-success hover:bg-success/10">
                  <MessageCircle className="w-4 h-4 mr-1" />Atender
                </Button>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="aniversariantes" className="space-y-3">
          {aniversariantes.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Cake className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum aniversariante este mês</p>
            </div>
          )}
          {aniversariantes.map(l => (
            <div key={l.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center"><Cake className="w-5 h-5 text-gold" /></div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{l.nome}</h4>
                <p className="text-xs text-muted-foreground">Aniversário: {format(new Date(l.nascimento + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
              <Button size="sm" onClick={() => parabenizar(l)} className="bg-success/10 text-success hover:bg-success/20"><MessageCircle className="w-4 h-4 mr-1" />Parabenizar</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="campanha">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Phone className="w-4 h-4 text-gold" />Selecionar Leads</h3>
              <label className="flex items-center gap-2 mb-3 text-sm">
                <Checkbox checked={selected.size === leads.length && leads.length > 0} onCheckedChange={(c) => toggleAll(!!c)} />
                Selecionar todos
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leads.map(l => (
                  <label key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm cursor-pointer">
                    <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleOne(l.id)} />
                    <span className="flex-1 truncate">{l.nome}</span>
                    <span className="text-[10px] text-muted-foreground">({l.origem})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-gold" />Mensagem & Imagem</h3>
              <div>
                <Label>Mensagem</Label>
                <Textarea rows={5} value={mensagem} onChange={e => setMensagem(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">Use {"{nome}"} para personalizar</p>
              </div>
              <div>
                <Label className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />Imagem (URL opcional)</Label>
                <Input placeholder="https://..." value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} />
              </div>
              <Button onClick={disparar} className="w-full gradient-gold text-primary-foreground"><Send className="w-4 h-4 mr-2" />Disparar Campanha ({selected.size})</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
