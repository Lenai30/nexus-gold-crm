import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";

export default function NewLeadModal() {
  const { createLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", whatsapp: "", origem: "Manual", origem_tag: "organic" as "paid"|"organic",
    score: 3, status: "novos", campanha_nome: "", conjunto_nome: "", anuncio_nome: "", notas: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLead(form as any);
    setOpen(false);
    setForm({ nome: "", whatsapp: "", origem: "Manual", origem_tag: "organic", score: 3, status: "novos", campanha_nome: "", conjunto_nome: "", anuncio_nome: "", notas: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-gold text-primary-foreground gap-2"><Plus className="w-4 h-4" />Novo Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input required value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} /></div>
            <div><Label>WhatsApp *</Label><Input required placeholder="+5511..." value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Origem</Label><Input value={form.origem} onChange={e=>setForm({...form, origem: e.target.value})} /></div>
            <div>
              <Label>Tag</Label>
              <Select value={form.origem_tag} onValueChange={(v:any)=>setForm({...form, origem_tag: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Orgânico</SelectItem>
                  <SelectItem value="paid">Anúncios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v:any)=>setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novos">Novos</SelectItem>
                  <SelectItem value="negociacao">Em Negociação</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="posvenda">Pós-Venda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Score (1-5)</Label>
              <Input type="number" min={1} max={5} value={form.score} onChange={e=>setForm({...form, score: parseInt(e.target.value) || 3})} />
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="text-xs font-semibold text-gold uppercase mb-2">Dados da Campanha (opcional)</div>
            <div className="space-y-2">
              <Input placeholder="Nome da Campanha" value={form.campanha_nome} onChange={e=>setForm({...form, campanha_nome: e.target.value})} />
              <Input placeholder="Conjunto de Anúncios" value={form.conjunto_nome} onChange={e=>setForm({...form, conjunto_nome: e.target.value})} />
              <Input placeholder="Nome do Anúncio" value={form.anuncio_nome} onChange={e=>setForm({...form, anuncio_nome: e.target.value})} />
            </div>
          </div>
          <div><Label>Notas</Label><Textarea value={form.notas} onChange={e=>setForm({...form, notas: e.target.value})} /></div>
          <Button type="submit" className="w-full gradient-gold text-primary-foreground">Criar Lead</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
