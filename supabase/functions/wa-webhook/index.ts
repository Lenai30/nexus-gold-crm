// Receive WhatsApp messages from Evolution API and fan-out raw payload to user's n8n webhooks
// URL: POST /functions/v1/wa-webhook?token=<webhook_token>
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normalizePhone = (s: string) => String(s || "").replace(/\D/g, "");
const extractText = (msg: any): string =>
  msg?.message?.conversation ||
  msg?.message?.extendedTextMessage?.text ||
  msg?.message?.imageMessage?.caption ||
  msg?.message?.videoMessage?.caption ||
  msg?.text || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "Missing token" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase.from("settings").select("user_id").eq("webhook_token", token).maybeSingle();
    if (!settings) return json({ error: "Invalid token" }, 401);
    const userId = settings.user_id;

    const rawPayload = await req.json().catch(() => ({}));

    // Parse and store messages for internal chat
    const data = (rawPayload as any)?.data || rawPayload;
    const items: any[] = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [data];

    const { data: leads } = await supabase.from("leads")
      .select("id, whatsapp, assigned_to, ai_paused_until, status").eq("user_id", userId);

    // Build per-message context (so n8n can decide whether AI should respond)
    const matchedLead = (phone: string) => {
      const tail = phone.slice(-10);
      return (leads || []).find((l) => String(l.whatsapp).replace(/\D/g, "").endsWith(tail));
    };

    let firstContext: any = null;
    let processed = 0;
    for (const item of items) {
      if (!item) continue;
      const fromMe = item?.key?.fromMe === true;
      if (fromMe) continue;
      const remoteJid: string = item?.key?.remoteJid || item?.remoteJid || item?.from || "";
      if (remoteJid.includes("@g.us")) continue;
      const phone = normalizePhone(remoteJid.split("@")[0] || "");
      const text = extractText(item);
      if (!phone || !text) continue;

      const lead = matchedLead(phone);
      const aiPaused = !!(lead?.ai_paused_until && new Date(lead.ai_paused_until).getTime() > Date.now());

      await supabase.from("messages").insert({
        user_id: userId,
        lead_id: lead?.id || null,
        whatsapp: phone,
        direction: "in",
        content: text,
        status: "received",
      });
      if (lead?.id) {
        await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", lead.id);
      }
      if (!firstContext) {
        firstContext = {
          lead_id: lead?.id || null,
          status: lead?.status || null,
          assigned_to: lead?.assigned_to || null,
          ai_paused: aiPaused,
          ai_paused_until: lead?.ai_paused_until || null,
        };
      }
      processed++;
    }

    // FAN-OUT to user's n8n webhooks with enriched context (fire-and-forget)
    (async () => {
      const { data: hooks } = await supabase
        .from("n8n_webhooks")
        .select("id, url")
        .eq("user_id", userId)
        .eq("active", true);
      const enrichedPayload = { ...(rawPayload as any), crm_context: firstContext };
      await Promise.allSettled(
        (hooks || []).map((h) =>
          fetch(h.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(enrichedPayload),
          }).catch(() => null),
        ),
      );
    })();

    return json({ success: true, processed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
