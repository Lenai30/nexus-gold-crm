import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Lead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, Loader2, MessageCircle, Smile, Paperclip, X, FileText, UserCheck, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  id: string;
  lead_id: string | null;
  direction: "in" | "out";
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
  sender_name?: string | null;
}

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeamOption { user_id: string; display_name: string; role_title: string; }

export default function ChatDrawer({ lead, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; type: string; name: string; preview: string } | null>(null);
  const [team, setTeam] = useState<TeamOption[]>([]);
  const [assignee, setAssignee] = useState<string | null>(lead?.assigned_to || null);
  const [transferring, setTransferring] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync assignee from lead prop (lead may be updated via realtime by parent)
  useEffect(() => { setAssignee(lead?.assigned_to || null); }, [lead?.assigned_to]);

  // Load team options (org members) — only if you can transfer
  useEffect(() => {
    if (!open || !lead || !user) return;
    const canTransfer = !assignee || assignee === user.id || lead.user_id === user.id;
    if (!canTransfer) { setTeam([]); return; }
    (async () => {
      const ownerId = lead.user_id;
      const { data: members } = await supabase.from("team_members")
        .select("member_user_id, display_name, role_title")
        .eq("owner_id", ownerId).eq("active", true);
      const { data: ownerProfile } = await supabase.from("profiles")
        .select("id, empresa_nome").eq("id", ownerId).maybeSingle();
      const list: TeamOption[] = [
        { user_id: ownerId, display_name: (ownerProfile as any)?.empresa_nome || "Dono", role_title: "Dono" },
        ...((members || []).map((m: any) => ({ user_id: m.member_user_id, display_name: m.display_name, role_title: m.role_title }))),
      ];
      setTeam(list);
    })();
  }, [open, lead, user, assignee]);

  const transferTo = async (newAssignee: string) => {
    if (!lead || newAssignee === assignee) return;
    setTransferring(true);
    const { error } = await supabase.rpc("transfer_lead_assignment", {
      _lead_id: lead.id, _new_assignee: newAssignee,
    });
    setTransferring(false);
    if (error) { toast.error(error.message); return; }
    setAssignee(newAssignee);
    toast.success("Conversa transferida");
  };

  useEffect(() => {
    if (!open || !lead || !user) return;
    let active = true;
    setLoading(true);

    supabase
      .from("messages")
      .select("id, lead_id, direction, content, created_at, media_url, media_type, sender_name")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(error.message);
        setMessages((data || []) as Message[]);
        setLoading(false);
      });

    const ch = supabase
      .channel(`messages:${lead.id}:${crypto.randomUUID()}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lead_id=eq.${lead.id}` },
        (p) => setMessages((curr) => [...curr, p.new as Message]))
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [open, lead, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleFile = async (f: File) => {
    if (!user) return;
    if (f.size > 16 * 1024 * 1024) { toast.error("Arquivo máx 16MB"); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, f, { contentType: f.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!signed?.signedUrl) throw new Error("Falha ao gerar URL");
      setPendingFile({
        url: signed.signedUrl,
        type: f.type || "application/octet-stream",
        name: f.name,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
      });
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!lead || sending) return;
    if (!input.trim() && !pendingFile) return;
    const content = input.trim();
    const file = pendingFile;
    setSending(true); setInput(""); setPendingFile(null);
    try {
      const { data, error } = await supabase.functions.invoke("wa-send", {
        body: {
          lead_id: lead.id,
          content,
          media_url: file?.url || null,
          media_type: file?.type || null,
          file_name: file?.name || null,
        },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || "Erro ao enviar";
        toast.error(msg);
        setInput(content); setPendingFile(file);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar");
      setInput(content); setPendingFile(file);
    } finally { setSending(false); }
  };

  const renderMedia = (m: Message) => {
    if (!m.media_url) return null;
    const mt = (m.media_type || "").toLowerCase();
    if (mt.startsWith("image/")) {
      return <img src={m.media_url} alt="" className="rounded-lg max-w-full max-h-64 object-cover mb-1" />;
    }
    if (mt.startsWith("video/")) {
      return <video src={m.media_url} controls className="rounded-lg max-w-full max-h-64 mb-1" />;
    }
    if (mt.startsWith("audio/")) {
      return <audio src={m.media_url} controls className="w-full mb-1" />;
    }
    return (
      <a href={m.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-background/40 hover:bg-background/60 mb-1">
        <FileText className="w-5 h-5 shrink-0" />
        <span className="text-xs truncate">Arquivo</span>
      </a>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card">
        <SheetHeader className="px-5 py-4 border-b border-border bg-gradient-to-br from-gold/10 to-transparent">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
              {lead?.nome?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold truncate">{lead?.nome}</div>
              <div className="text-xs text-muted-foreground font-normal">{lead?.whatsapp}</div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Assignment bar */}
        {lead && (
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2 text-xs">
            <UserCheck className={`w-3.5 h-3.5 ${assignee ? "text-success" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground">Responsável:</span>
            <span className="font-medium truncate">
              {assignee
                ? (team.find(t => t.user_id === assignee)?.display_name || (assignee === user?.id ? "Você" : "Atribuído"))
                : "Livre — aguardando atendimento"}
            </span>
            {(team.length > 0) && (
              <div className="ml-auto flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                <Select value={assignee || ""} onValueChange={transferTo} disabled={transferring}>
                  <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Transferir..." /></SelectTrigger>
                  <SelectContent>
                    {team.map(t => (
                      <SelectItem key={t.user_id} value={t.user_id} className="text-xs">
                        {t.display_name} · {t.role_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}


        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <MessageCircle className="w-8 h-8 opacity-40" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug shadow-sm ${
                  m.direction === "out" ? "bg-gold/90 text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"
                }`}>
                  {m.direction === "out" && m.sender_name && (
                    <div className="text-[10px] font-bold opacity-90 mb-0.5">{m.sender_name}</div>
                  )}
                  {renderMedia(m)}
                  {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                  <div className={`text-[10px] mt-1 opacity-70 ${m.direction === "out" ? "text-right" : ""}`}>
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {pendingFile && (
          <div className="px-3 pt-2 bg-card border-t border-border">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
              {pendingFile.preview ? (
                <img src={pendingFile.preview} alt="" className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 rounded bg-background grid place-items-center"><FileText className="w-5 h-5 text-muted-foreground" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{pendingFile.name}</p>
                <p className="text-[10px] text-muted-foreground">{pendingFile.type}</p>
              </div>
              <button onClick={() => setPendingFile(null)} className="p-1 rounded hover:bg-background"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <div className="border-t border-border p-3 bg-card">
          <div className="flex gap-1.5 items-end">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-muted-foreground hover:text-gold hover:bg-muted transition" title="Emojis">
                  <Smile className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="p-0 border-0 bg-transparent shadow-none w-auto">
                <EmojiPicker
                  onEmojiClick={(e) => setInput((prev) => prev + e.emoji)}
                  emojiStyle={EmojiStyle.NATIVE}
                  theme={Theme.AUTO}
                  width={320}
                  height={380}
                  searchPlaceholder="Buscar emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </PopoverContent>
            </Popover>

            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-muted-foreground hover:text-gold hover:bg-muted transition disabled:opacity-50" title="Anexar">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Digite uma mensagem..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 max-h-32"
            />
            <button onClick={handleSend} disabled={(!input.trim() && !pendingFile) || sending}
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-gold to-gold/70 text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Enter envia · Shift+Enter quebra linha</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
