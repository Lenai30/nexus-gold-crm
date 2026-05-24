// Send WhatsApp message via Evolution API
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
    if (!leadId || !content) return json({ error: "lead_id and content required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const [{ data: settings }, { data: lead }] = await Promise.all([
      admin.from("settings").select("evolution_url, evolution_api_key, evolution_instance").eq("user_id", userId).maybeSingle(),
      admin.from("leads").select("id, whatsapp, user_id").eq("id", leadId).maybeSingle(),
    ]);

    if (!lead || lead.user_id !== userId) return json({ error: "Lead not found" }, 404);
    if (!settings?.evolution_url || !settings.evolution_api_key || !settings.evolution_instance) {
      return json({ error: "Evolution API não configurada. Vá em Configurações." }, 400);
    }

    const number = String(lead.whatsapp).replace(/\D/g, "");
    const url = `${settings.evolution_url.replace(/\/$/, "")}/message/sendText/${settings.evolution_instance}`;

    const evoRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: settings.evolution_api_key },
      body: JSON.stringify({ number, text: content, textMessage: { text: content } }),
    });
    const evoBody = await evoRes.text();
    if (!evoRes.ok) return json({ error: `Evolution: ${evoRes.status} ${evoBody}` }, 502);

    const { data: inserted, error: iErr } = await admin.from("messages").insert({
      user_id: userId, lead_id: leadId, whatsapp: number,
      direction: "out", content, status: "sent",
    }).select().single();
    if (iErr) return json({ error: iErr.message }, 500);

    await admin.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", leadId);

    return json({ success: true, message: inserted });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
