import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Trash2, Copy, Check, Link2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const SECTORS: Record<string, { label: string; roles: string[] }> = {
  imobiliaria: { label: "Imobiliária", roles: ["Corretor", "Gerente de Vendas", "Captador", "Financeiro", "Atendente"] },
  garagem: { label: "Garagem / Concessionária", roles: ["Vendedor de Veículos", "Gerente", "Avaliador", "Financeiro", "F&I"] },
  clinica: { label: "Clínica / Saúde", roles: ["Recepcionista", "Médico", "Atendente", "Financeiro", "Gerente"] },
  ecommerce: { label: "E-commerce / Loja", roles: ["Vendedor", "Atendimento", "Logística", "Financeiro", "Gerente"] },
  servicos: { label: "Serviços / Geral", roles: ["Atendente", "Vendedor", "Financeiro", "Gerente", "Suporte"] },
};

const CAPS = [
  { key: "leads.view_all", label: "Ver TODOS os leads da empresa" },
  { key: "leads.view_assigned", label: "Ver leads atribuídos a si" },
  { key: "leads.create", label: "Criar leads" },
  { key: "leads.edit", label: "Editar leads" },
  { key: "leads.delete", label: "Excluir leads" },
  { key: "chat.send", label: "Conversar no chat (WhatsApp)" },
  { key: "reports.view", label: "Ver relatórios" },
  { key: "settings.view", label: "Ver configurações" },
];

interface Invite { id: string; email: string; token: string; display_name: string; role_title: string; sector: string; capabilities: string[]; expires_at: string; used_at: string | null; }
interface Member { id: string; member_user_id: string; display_name: string; role_title: string; sector: string; capabilities: string[]; active: boolean; }

export default function Equipe() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // form
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sector, setSector] = useState("imobiliaria");
  const [roleTitle, setRoleTitle] = useState("Corretor");
  const [caps, setCaps] = useState<string[]>(["leads.view_assigned", "leads.edit", "chat.send"]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [iRes, mRes] = await Promise.all([
      supabase.from("team_invites").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("team_members").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    ]);
    setInvites((iRes.data as Invite[]) || []);
    setMembers((mRes.data as Member[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createInvite = async () => {
    if (!user || !email.trim() || !displayName.trim()) { toast.error("Preencha email e nome"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("team_invites").insert({
      owner_id: user.id, email: email.trim().toLowerCase(),
      display_name: displayName.trim(), role_title: roleTitle, sector, capabilities: caps,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setEmail(""); setDisplayName("");
    toast.success("Convite criado — copie o link e envie ao funcionário");
    load();
  };

  const deleteInvite = async (id: string) => {
    if (!confirm("Excluir este convite?")) return;
    await supabase.from("team_invites").delete().eq("id", id);
    load();
  };

  const toggleMember = async (m: Member) => {
    await supabase.from("team_members").update({ active: !m.active }).eq("id", m.id);
    load();
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`Remover ${m.display_name} da equipe?`)) return;
    await supabase.from("team_members").delete().eq("id", m.id);
    load();
  };

  const inviteLink = (token: string) => `${window.location.origin}/auth?invite=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(inviteLink(token));
    setCopiedToken(token); setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Link copiado");
  };

  const toggleCap = (k: string) => setCaps((c) => c.includes(k) ? c.filter(x => x !== k) : [...c, k]);
  const roles = SECTORS[sector]?.roles || [];

  return (
    <div className="max-w-5xl">
      <div className="mb-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <h1 className="text-2xl font-bold gradient-gold-text flex items-center gap-2"><Users className="w-6 h-6" />Equipe</h1>
        <p className="text-sm text-muted-foreground mt-1">Convide funcionários, defina cargos e permissões granulares.</p>
      </div>

      <div className="grid gap-6">
        {/* Novo convite */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-gold" />Convidar funcionário
          </h2>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div><Label>Nome do funcionário</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ex: João Silva" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@empresa.com" /></div>
            <div>
              <Label>Setor</Label>
              <Select value={sector} onValueChange={(v) => { setSector(v); setRoleTitle(SECTORS[v].roles[0]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTORS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cargo</Label>
              <Select value={roleTitle} onValueChange={setRoleTitle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4">
            <Label className="flex items-center gap-1.5 mb-2"><ShieldCheck className="w-4 h-4 text-gold" />Permissões</Label>
            <div className="grid sm:grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40">
              {CAPS.map(c => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/60 rounded px-2 py-1.5">
                  <Checkbox checked={caps.includes(c.key)} onCheckedChange={() => toggleCap(c.key)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={createInvite} disabled={submitting} className="gradient-gold text-primary-foreground">
            <UserPlus className="w-4 h-4 mr-1.5" />Gerar convite
          </Button>
        </section>

        {/* Convites pendentes */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-gold" />Convites ({invites.filter(i => !i.used_at).length} pendentes)
          </h2>
          {invites.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum convite criado.</p>}
          <div className="space-y-2">
            {invites.map(inv => {
              const used = !!inv.used_at;
              const expired = new Date(inv.expires_at) < new Date();
              return (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{inv.display_name}</span>
                      <span className="text-xs text-muted-foreground">· {inv.role_title}</span>
                      {used && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success">Aceito</span>}
                      {!used && expired && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Expirado</span>}
                      {!used && !expired && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold">Pendente</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                  </div>
                  {!used && !expired && (
                    <Button onClick={() => copyLink(inv.token)} variant="outline" size="sm">
                      {copiedToken === inv.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span className="ml-1.5 hidden sm:inline">Copiar link</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteInvite(inv.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Membros ativos */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gold" />Membros ({members.filter(m => m.active).length} ativos)
          </h2>
          {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum funcionário ainda. Convide pelo formulário acima.</p>}
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="w-10 h-10 rounded-full bg-gold/20 grid place-items-center text-gold font-bold">{m.display_name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground">{m.role_title} · {SECTORS[m.sector]?.label || m.sector} · {m.capabilities.length} permissões</p>
                </div>
                <button onClick={() => toggleMember(m)} className={`text-xs px-2.5 py-1 rounded-full border ${m.active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
                  {m.active ? "Ativo" : "Inativo"}
                </button>
                <Button variant="ghost" size="sm" onClick={() => removeMember(m)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
