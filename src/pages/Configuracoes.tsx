import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Link2, Info, Lock, Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PASSWORD = "nexus2026";

export default function Configuracoes() {
  const { settings, loading, updateSettings } = useSettings();
  const { user } = useAuth();
  const { leads } = useLeads();
  const [empresaNome, setEmpresaNome] = useState(settings?.empresa_nome || "");
  const [pwInput, setPwInput] = useState("");
  const [webhookUnlocked, setWebhookUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [evoUrl, setEvoUrl] = useState("");
  const [evoKey, setEvoKey] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [savingEvo, setSavingEvo] = useState(false);

  useEffect(() => {
    setEmpresaNome(settings?.empresa_nome || "");
    setEvoUrl(settings?.evolution_url || "");
    setEvoKey(settings?.evolution_api_key || "");
    setEvoInstance(settings?.evolution_instance || "");
  }, [settings?.empresa_nome, settings?.evolution_url, settings?.evolution_api_key, settings?.evolution_instance]);

  if (loading || !settings) return (
    <div className="grid min-h-[55vh] place-items-center text-muted-foreground">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
        <p className="text-sm">Carregando configurações...</p>
      </div>
    </div>
  );

  const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-lead?token=${settings.webhook_token}`;
  const samplePayload = JSON.stringify({
    nome: "João Silva", whatsapp: "+5511999990000",
    origem: "Facebook Ads", origem_tag: "paid", score: 5,
    campanha_nome: "Black Friday 2026", conjunto_nome: "Lookalike 1%", anuncio_nome: "Vídeo Depoimento",
  }, null, 2);

  const saveNome = async () => {
    const { error } = await updateSettings({ empresa_nome: empresaNome });
    if (error) toast.error(error.message); else toast.success("Nome atualizado");
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada");
  };

  const waWebhookUrl = `${SUPABASE_URL}/functions/v1/wa-webhook?token=${settings.webhook_token}`;
  const copyWaUrl = () => {
    navigator.clipboard.writeText(waWebhookUrl);
    setWaCopied(true); setTimeout(() => setWaCopied(false), 2000);
    toast.success("URL copiada");
  };

  const saveEvolution = async () => {
    setSavingEvo(true);
    const { error } = await updateSettings({
      evolution_url: evoUrl.trim() || null,
      evolution_api_key: evoKey.trim() || null,
      evolution_instance: evoInstance.trim() || null,
    } as any);
    setSavingEvo(false);
    if (error) toast.error(error.message); else toast.success("WhatsApp configurado");
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <h1 className="text-2xl font-bold gradient-gold-text">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalize o sistema e configure integrações</p>
      </div>

      <div className="grid gap-6">
        {/* Identidade */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Layers className="w-5 h-5 text-gold" />Identidade (Whitelabel)</h2>
          <Label>Nome da Empresa</Label>
          <Input value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} className="mb-2" />
          <p className="text-xs text-muted-foreground mb-3">Atualiza o título e a sidebar</p>
          <Button onClick={saveNome} className="gradient-gold text-primary-foreground">Salvar Nome</Button>
        </section>

        {/* Webhooks */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Link2 className="w-5 h-5 text-gold" />Webhooks & Integrações</h2>
          {!webhookUnlocked ? (
            <div>
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/40 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Insira a senha para acessar os Webhooks</span>
              </div>
              <div className="flex gap-2">
                <Input type="password" placeholder="Senha" value={pwInput} onChange={e => setPwInput(e.target.value)} />
                <Button onClick={() => pwInput === PASSWORD ? setWebhookUnlocked(true) : toast.error("Senha incorreta")} className="gradient-gold text-primary-foreground">Desbloquear</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>URL do Webhook (cole no n8n)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button onClick={copyUrl} variant="outline">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Esta URL é única para sua conta. Configure um nó HTTP Request (POST) no n8n.</p>
              </div>
              <div>
                <Label>Exemplo de Payload JSON</Label>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">{samplePayload}</pre>
              </div>
            </div>
          )}
        </section>

        {/* WhatsApp Evolution */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-1"><MessageCircle className="w-5 h-5 text-gold" />WhatsApp (Evolution API)</h2>
          <p className="text-xs text-muted-foreground mb-4">Configure sua instância da Evolution API para enviar e receber mensagens dentro do CRM.</p>
          <div className="grid gap-3">
            <div>
              <Label>URL da Evolution</Label>
              <Input value={evoUrl} onChange={e => setEvoUrl(e.target.value)} placeholder="https://evo.seudominio.com" className="font-mono text-xs" />
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" value={evoKey} onChange={e => setEvoKey(e.target.value)} placeholder="sua chave da Evolution" className="font-mono text-xs" />
            </div>
            <div>
              <Label>Nome da Instância</Label>
              <Input value={evoInstance} onChange={e => setEvoInstance(e.target.value)} placeholder="ex: loja-crm" className="font-mono text-xs" />
            </div>
            <Button onClick={saveEvolution} disabled={savingEvo} className="gradient-gold text-primary-foreground w-fit">
              {savingEvo ? "Salvando..." : "Salvar Integração"}
            </Button>

            <div className="mt-4 pt-4 border-t border-border">
              <Label>URL de Webhook (cole no painel da Evolution)</Label>
              <div className="flex gap-2">
                <Input readOnly value={waWebhookUrl} className="font-mono text-xs" />
                <Button onClick={copyWaUrl} variant="outline">{waCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">No painel da Evolution → Webhook → ative o evento <code className="bg-muted px-1 rounded">MESSAGES_UPSERT</code> apontando para esta URL.</p>
            </div>
          </div>
        </section>


        {/* Info */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Info className="w-5 h-5 text-gold" />Informações do Sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Versão</p>
              <p className="font-semibold">Nexus CRM Gold v12</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-semibold text-sm truncate">{user?.email}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Total de Leads</p>
              <p className="font-semibold">{leads.length} leads</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
