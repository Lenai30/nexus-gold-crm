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

    // FAN-OUT to user's n8n webhooks (fire-and-forget, non-blocking)
    (async () => {
      const { data: hooks } = await supabase
        .from("n8n_webhooks")
        .select("id, url")
        .eq("user_id", userId)
        .eq("active", true);
      await Promise.allSettled(
        (hooks || []).map((h) =>
          fetch(h.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rawPayload),
          }).catch(() => null),
        ),
      );
    })();

    // Parse and store messages for internal chat
    const data = (rawPayload as any)?.data || rawPayload;
    const items: any[] = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [data];

    const { data: leads } = await supabase.from("leads").select("id, whatsapp").eq("user_id", userId);

    let processed = 0;
    for (const item of items) {
      if (!item) continue;
      const fromMe = item?.key?.fromMe === true;
      if (fromMe) continue;
      const remoteJid: string = item?.key?.remoteJid || item?.remoteJid || item?.from || "";
      if (remoteJid.includes("@g.us")) continue; // ignore groups
      const phone = normalizePhone(remoteJid.split("@")[0] || "");
      const text = extractText(item);
      if (!phone || !text) continue;

      const tail = phone.slice(-10);
      const lead = (leads || []).find((l) => normalizePhone(l.whatsapp).endsWith(tail));

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
      processed++;
    }

    return json({ success: true, processed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
