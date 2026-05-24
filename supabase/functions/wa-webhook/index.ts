// Receive WhatsApp messages from Evolution API
// URL: POST /functions/v1/wa-webhook?token=<webhook_token>
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(s: string) {
  return String(s || "").replace(/\D/g, "");
}

function extractText(msg: any): string {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.text ||
    ""
  );
}

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

    const payload = await req.json().catch(() => ({}));
    // Evolution sends { event, data: { ... } } or array under data.messages
    const data = payload?.data || payload;
    const items: any[] = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [data];

    const results: any[] = [];
    for (const item of items) {
      if (!item) continue;
      const fromMe = item?.key?.fromMe === true;
      if (fromMe) continue; // ignore outgoing messages echoed back

      const remoteJid: string = item?.key?.remoteJid || item?.remoteJid || item?.from || "";
      const phone = normalizePhone(remoteJid.split("@")[0] || "");
      const text = extractText(item);
      if (!phone || !text) continue;

      // Match lead by phone (last 10-11 digits)
      const tail = phone.slice(-10);
      const { data: leads } = await supabase
        .from("leads")
        .select("id, whatsapp")
        .eq("user_id", userId);
      const lead = (leads || []).find((l) => normalizePhone(l.whatsapp).endsWith(tail));

      const ins = await supabase.from("messages").insert({
        user_id: userId,
        lead_id: lead?.id || null,
        whatsapp: phone,
        direction: "in",
        content: text,
        status: "received",
      }).select().single();

      if (lead?.id) {
        await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", lead.id);
      }
      results.push({ inserted: !ins.error, lead_id: lead?.id || null });
    }

    return json({ success: true, processed: results.length, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
