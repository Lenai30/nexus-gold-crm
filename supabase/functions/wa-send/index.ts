// Send WhatsApp message via Evolution API (text or media)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const leadId = String(body.lead_id || "");
    const content = String(body.content || "").trim();
    const mediaUrl = body.media_url ? String(body.media_url) : null;
    const mediaType = body.media_type ? String(body.media_type) : null;
    const fileName = body.file_name ? String(body.file_name) : null;
    if (!leadId || (!content && !mediaUrl)) return json({ error: "lead_id and content/media required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const evoBase = (Deno.env.get("EVOLUTION_URL") || "").replace(/\/$/, "");
    const evoKey = Deno.env.get("EVOLUTION_API_KEY") || "";
    if (!evoBase || !evoKey) return json({ error: "Evolution não configurada no servidor" }, 500);

    const [{ data: member }, { data: lead }] = await Promise.all([
      admin.from("team_members").select("owner_id, display_name").eq("member_user_id", userId).maybeSingle(),
      admin.from("leads").select("id, whatsapp, user_id").eq("id", leadId).maybeSingle(),
    ]);

    const ownerId = member?.owner_id || userId;
    const { data: settings } = await admin.from("settings").select("evolution_instance, empresa_nome").eq("user_id", ownerId).maybeSingle();
    const senderName = member?.display_name || settings?.empresa_nome || "Atendente";

    if (!lead || lead.user_id !== ownerId) return json({ error: "Lead not found" }, 404);
    if (!settings?.evolution_instance) {
      return json({ error: "WhatsApp não conectado. Vá em Configurações e clique em Conectar." }, 400);
    }

    const number = String(lead.whatsapp).replace(/\D/g, "");
    const instance = settings.evolution_instance;
    const headers = { "Content-Type": "application/json", apikey: evoKey };

    // Signature on top of message (so client knows who is talking)
    const signedText = content ? `*${senderName}:*\n${content}` : "";

    let evoRes: Response;
    if (mediaUrl) {
      const mt = (mediaType || "").toLowerCase();
      const kind = mt.startsWith("image/") ? "image"
        : mt.startsWith("video/") ? "video"
        : mt.startsWith("audio/") ? "audio" : "document";
      evoRes = await fetch(`${evoBase}/message/sendMedia/${instance}`, {
        method: "POST", headers,
        body: JSON.stringify({
          number,
          mediatype: kind,
          mimetype: mediaType || "application/octet-stream",
          media: mediaUrl,
          fileName: fileName || "arquivo",
          caption: signedText || `*${senderName}*`,
        }),
      });
    } else {
      evoRes = await fetch(`${evoBase}/message/sendText/${instance}`, {
        method: "POST", headers,
        body: JSON.stringify({ number, text: signedText, textMessage: { text: signedText } }),
      });
    }
    const evoBody = await evoRes.text();
    if (!evoRes.ok) return json({ error: `Evolution: ${evoRes.status} ${evoBody}` }, 502);


    const { data: inserted, error: iErr } = await admin.from("messages").insert({
      user_id: ownerId, lead_id: leadId, whatsapp: number,
      direction: "out", content: content || (mediaUrl ? `[${mediaType?.split("/")[0] || "arquivo"}]` : ""),
      status: "sent",
      media_url: mediaUrl, media_type: mediaType,
      sender_id: userId, sender_name: senderName,
    }).select().single();
    if (iErr) return json({ error: iErr.message }, 500);

    await admin.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", leadId);
    return json({ success: true, message: inserted, _signed: sigContent.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
