// Lead lookup endpoint for n8n routing
// GET/POST /functions/v1/lead-lookup?token=<webhook_token>&whatsapp=<num>[&campaign_id=<id>]
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const digits = (s: string) => String(s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") || "";
    let whatsapp = url.searchParams.get("whatsapp") || "";
    let campaign_id = url.searchParams.get("campaign_id") || "";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({} as any));
      token = token || body.token || "";
      whatsapp = whatsapp || body.whatsapp || body.number || body.phone || "";
      campaign_id = campaign_id || body.campaign_id || body.campanha_id || "";
    }
    if (!token) return json({ error: "Missing token" }, 401);
    if (!whatsapp) return json({ error: "Missing whatsapp" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase.from("settings")
      .select("user_id").eq("webhook_token", token).maybeSingle();
    if (!settings) return json({ error: "Invalid token" }, 401);
    const userId = settings.user_id;

    const phone = digits(whatsapp);
    const tail = phone.slice(-10);

    const { data: leads } = await supabase.from("leads")
      .select("id, nome, whatsapp, status, assigned_to, ai_paused_until, campanha_id, campanha_nome, score, last_interaction, created_at")
      .eq("user_id", userId);

    const lead = (leads || []).find(l => digits(l.whatsapp).endsWith(tail)) || null;

    const now = Date.now();
    const aiPaused = !!(lead?.ai_paused_until && new Date(lead.ai_paused_until).getTime() > now);

    // Routing logic for n8n Switch node
    // - not_found: novo lead (cria no CRM, envia para Vendas)
    // - sales: já existe com status novos/followup → Agente de Vendas
    // - support: já é cliente (posvenda) → Agente de Suporte
    // - human: status negociacao OU ai_paused → humano cuidando, NÃO responder
    let route: "not_found" | "sales" | "support" | "human" = "not_found";
    if (!lead) {
      route = "not_found";
    } else if (lead.status === "posvenda") {
      route = "support";
    } else if (lead.status === "negociacao" || aiPaused) {
      route = "human";
    } else {
      // novos, followup, qualquer outro → vendas
      route = "sales";
    }

    const hasIncomingCampaign = !!campaign_id;
    const isNewFromAd = !lead && hasIncomingCampaign;

    return json({
      exists: !!lead,
      route,
      should_respond: route !== "human",
      is_new_from_ad: isNewFromAd,
      ai_paused: aiPaused,
      lead: lead ? {
        id: lead.id,
        nome: lead.nome,
        whatsapp: lead.whatsapp,
        status: lead.status,
        assigned_to: lead.assigned_to,
        campanha_id: lead.campanha_id,
        campanha_nome: lead.campanha_nome,
        score: lead.score,
        last_interaction: lead.last_interaction,
        created_at: lead.created_at,
      } : null,
      incoming_campaign_id: campaign_id || null,
      whatsapp_normalized: phone,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
