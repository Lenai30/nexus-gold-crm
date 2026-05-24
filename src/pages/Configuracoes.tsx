import { useEffect, useState, useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Link2, Info, Lock, Copy, Check, MessageCircle, QrCode, Plus, Trash2, RefreshCw, Power } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PASSWORD = "nexus2026";

interface N8nHook { id: string; name: string; url: string; active: boolean; }

export default function Configuracoes() {
  const { settings, loading, updateSettings } = useSettings();
  const { user } = useAuth();
  const { leads } = useLeads();
  const [empresaNome, setEmpresaNome] = useState(settings?.empresa_nome || "");
  const [pwInput, setPwInput] = useState("");
  const [webhookUnlocked, setWebhookUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [evoUrl, setEvoUrl] = useState("");
  const [evoKey, setEvoKey] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [savingEvo, setSavingEvo] = useState(false);

  // Connection state
  const [connState, setConnState] = useState<string>("unknown");
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  // n8n webhooks
  const [hooks, setHooks] = useState<N8nHook[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    setEmpresaNome(settings?.empresa_nome || "");
    setEvoUrl(settings?.evolution_url || "");
    setEvoKey(settings?.evolution_api_key || "");
    setEvoInstance(settings?.evolution_instance || "");
  }, [settings?.empresa_nome, settings?.evolution_url, settings?.evolution_api_key, settings?.evolution_instance]);

  const loadHooks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("n8n_webhooks").select("*").eq("user_id", user.id).order("created_at");
    setHooks((data as N8nHook[]) || []);
  }, [user]);

  useEffect(() => { loadHooks(); }, [loadHooks]);

  const refreshStatus = useCallback(async () => {
    if (!settings?.evolution_instance) return;
    const { data } = await supabase.functions.invoke("wa-instance", { body: { action: "status" } });
    if (data?.state) setConnState(data.state);
  }, [settings?.evolution_instance]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

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

  const saveEvolution = async () => {
    setSavingEvo(true);
    const { error } = await updateSettings({
      evolution_url: evoUrl.trim() || null,
      evolution_api_key: evoKey.trim() || null,
      evolution_instance: evoInstance.trim() || null,
    } as any);
    setSavingEvo(false);
    if (error) toast.error(error.message); else toast.success("Credenciais salvas");
  };

  const connectInstance = async () => {
    if (!evoInstance.trim()) { toast.error("Defina o nome da instância"); return; }
    setConnectLoading(true);
    try {
      // Save credentials first
      await updateSettings({
        evolution_url: evoUrl.trim() || null,
        evolution_api_key: evoKey.trim() || null,
        evolution_instance: evoInstance.trim() || null,
      } as any);
      const { data: created, error } = await supabase.functions.invoke("wa-instance", {
        body: { action: "create", instance: evoInstance.trim() },
      });
      if (error) throw error;
      if (created?.error) throw new Error(created.error);
      // Fetch QR
      const { data: qr } = await supabase.functions.invoke("wa-instance", {
        body: { action: "qrcode", instance: evoInstance.trim() },
      });
      if (qr?.qrcode) setQrcode(qr.qrcode);
      toast.success("Instância pronta — escaneie o QR Code");
      setTimeout(refreshStatus, 3000);
    } catch (e: any) {
      toast.error(e.message || "Erro ao conectar");
    } finally { setConnectLoading(false); }
  };

  const fetchQr = async () => {
    setConnectLoading(true);
    const { data } = await supabase.functions.invoke("wa-instance", { body: { action: "qrcode" } });
    if (data?.qrcode) setQrcode(data.qrcode);
    else toast.error(data?.error || "Sem QR disponível");
    setConnectLoading(false);
  };

  const logoutInstance = async () => {
    if (!confirm("Desconectar o WhatsApp?")) return;
    await supabase.functions.invoke("wa-instance", { body: { action: "logout" } });
    setQrcode(null); setConnState("close");
    toast.success("Desconectado");
  };

  const addHook = async () => {
    if (!user || !newUrl.trim()) { toast.error("URL obrigatória"); return; }
    const { error } = await supabase.from("n8n_webhooks").insert({
      user_id: user.id, name: newName.trim() || "Webhook n8n", url: newUrl.trim(), active: true,
    });
    if (error) { toast.error(error.message); return; }
    setNewName(""); setNewUrl(""); loadHooks();
    toast.success("Webhook adicionado");
  };

  const toggleHook = async (h: N8nHook) => {
    await supabase.from("n8n_webhooks").update({ active: !h.active }).eq("id", h.id);
    loadHooks();
  };

  const deleteHook = async (id: string) => {
    if (!confirm("Remover este webhook?")) return;
    await supabase.from("n8n_webhooks").delete().eq("id", id);
    loadHooks();
    toast.success("Removido");
  };

  const stateLabel: Record<string, { text: string; cls: string }> = {
    open: { text: "Conectado", cls: "bg-success/15 text-success border-success/30" },
    connecting: { text: "Conectando...", cls: "bg-gold/15 text-gold border-gold/30" },
    close: { text: "Desconectado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    unknown: { text: "—", cls: "bg-muted text-muted-foreground border-border" },
  };
  const st = stateLabel[connState] || stateLabel.unknown;

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
          <Button onClick={saveNome} className="gradient-gold text-primary-foreground">Salvar Nome</Button>
        </section>

        {/* WhatsApp Evolution + QR */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-gold" />WhatsApp (Evolution API)
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${st.cls}`}>{st.text}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Conecte sua instância da Evolution. O sistema recebe as mensagens e repassa o payload completo aos seus webhooks do n8n abaixo.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>URL da Evolution</Label>
                <Input value={evoUrl} onChange={e => setEvoUrl(e.target.value)} placeholder="https://evolution.lenai.com.br" className="font-mono text-xs" />
              </div>
              <div>
                <Label>API Key Global</Label>
                <Input type="password" value={evoKey} onChange={e => setEvoKey(e.target.value)} placeholder="sua chave global" className="font-mono text-xs" />
              </div>
              <div>
                <Label>Nome da Instância</Label>
                <Input value={evoInstance} onChange={e => setEvoInstance(e.target.value)} placeholder="ex: loja-crm" className="font-mono text-xs" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveEvolution} disabled={savingEvo} variant="outline" size="sm">
                  {savingEvo ? "Salvando..." : "Salvar"}
                </Button>
                <Button onClick={connectInstance} disabled={connectLoading} className="gradient-gold text-primary-foreground" size="sm">
                  <QrCode className="w-4 h-4 mr-1" /> {connectLoading ? "Aguarde..." : "Conectar / Gerar QR"}
                </Button>
                <Button onClick={fetchQr} variant="outline" size="sm" disabled={!settings.evolution_instance}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Atualizar QR
                </Button>
                <Button onClick={refreshStatus} variant="outline" size="sm" disabled={!settings.evolution_instance}>
                  Status
                </Button>
                <Button onClick={logoutInstance} variant="outline" size="sm" disabled={!settings.evolution_instance}>
                  <Power className="w-4 h-4 mr-1" /> Desconectar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A instância é criada já configurada para: ignorar grupos, sempre online, enviar e receber texto/áudio/imagem.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center bg-muted/30 rounded-xl p-4 min-h-[260px] border border-dashed border-border">
              {qrcode ? (
                <>
                  <img src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`} alt="QR Code" className="w-56 h-56 rounded-lg bg-white p-2" />
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho
                  </p>
                </>
              ) : connState === "open" ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-success/15 grid place-items-center mx-auto mb-3">
                    <Check className="w-8 h-8 text-success" />
                  </div>
                  <p className="font-semibold text-success">WhatsApp conectado</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Clique em "Conectar / Gerar QR"</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* n8n Webhooks */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-1">
            <Link2 className="w-5 h-5 text-gold" />Webhooks n8n (saída)
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Toda mensagem recebida do WhatsApp é repassada (payload completo da Evolution) para cada webhook ativo abaixo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 mb-4">
            <Input placeholder="Nome (ex: Atendimento)" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="https://n8n.seu-dominio.com/webhook/..." value={newUrl} onChange={e => setNewUrl(e.target.value)} className="font-mono text-xs" />
            <Button onClick={addHook} className="gradient-gold text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
          </div>

          <div className="space-y-2">
            {hooks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum webhook ainda. Adicione acima.</p>
            )}
            {hooks.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <button
                  onClick={() => toggleHook(h)}
                  className={`w-3 h-3 rounded-full ${h.active ? "bg-success" : "bg-muted-foreground/40"}`}
                  title={h.active ? "Ativo (clique para desativar)" : "Inativo"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{h.url}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteHook(h.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Webhook entrada de leads */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Link2 className="w-5 h-5 text-gold" />Webhook de Entrada (Leads)</h2>
          {!webhookUnlocked ? (
            <div>
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/40 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Insira a senha para acessar</span>
              </div>
              <div className="flex gap-2">
                <Input type="password" placeholder="Senha" value={pwInput} onChange={e => setPwInput(e.target.value)} />
                <Button onClick={() => pwInput === PASSWORD ? setWebhookUnlocked(true) : toast.error("Senha incorreta")} className="gradient-gold text-primary-foreground">Desbloquear</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>URL do Webhook (cole no n8n para criar leads)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button onClick={copyUrl} variant="outline">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                </div>
              </div>
              <div>
                <Label>Exemplo de Payload JSON</Label>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">{samplePayload}</pre>
              </div>
            </div>
          )}
        </section>

        {/* Info */}
        <section className="bg-card/90 border border-border rounded-2xl p-6 shadow-sm hover:border-gold/30 transition-colors">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Info className="w-5 h-5 text-gold" />Informações do Sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Versão</p>
              <p className="font-semibold">Nexus CRM Gold v13</p>
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
