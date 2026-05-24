import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Lead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  lead_id: string | null;
  direction: "in" | "out";
  content: string;
  created_at: string;
}

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChatDrawer({ lead, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !lead || !user) return;
    let active = true;
    setLoading(true);

    supabase
      .from("messages")
      .select("id, lead_id, direction, content, created_at")
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lead_id=eq.${lead.id}` },
        (p) => setMessages((curr) => [...curr, p.new as Message]),
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [open, lead, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!lead || !input.trim() || sending) return;
    const content = input.trim();
    setSending(true);
    setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("wa-send", {
        body: { lead_id: lead.id, content },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || "Erro ao enviar";
        toast.error(msg);
        setInput(content);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar");
      setInput(content);
    } finally {
      setSending(false);
    }
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <MessageCircle className="w-8 h-8 opacity-40" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-xs">Envie a primeira mensagem abaixo</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-snug shadow-sm ${
                  m.direction === "out"
                    ? "bg-gold/90 text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={`text-[10px] mt-1 opacity-70 ${m.direction === "out" ? "text-right" : ""}`}>
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-3 bg-card">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Digite uma mensagem..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-gold to-gold/70 text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Enter envia · Shift+Enter quebra linha</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
