// Webhook público para receber leads do n8n
// URL: POST /functions/v1/webhook-lead?token=<webhook_token>
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings, error: sErr } = await supabase
      .from("settings")
      .select("user_id")
      .eq("webhook_token", token)
      .maybeSingle();

    if (sErr || !settings) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const nome = body.nome || body.name || body.full_name;
    const whatsapp = body.whatsapp || body.phone || body.telefone;

    if (!nome || !whatsapp) {
      return new Response(JSON.stringify({ error: "nome e whatsapp obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    const lead = {
      user_id: settings.user_id,
      nome: String(nome).slice(0, 200),
      whatsapp: String(whatsapp).slice(0, 30),
      origem: body.origem || body.source || "Webhook n8n",
      origem_tag: body.origem_tag === "paid" ? "paid" : "organic",
      score: Math.min(5, Math.max(1, parseInt(body.score) || 3)),
      status: ["novos","negociacao","followup","posvenda"].includes(body.status) ? body.status : "novos",
      notas: body.notas || body.notes || null,
      campanha_id: body.campanha_id || body.campaign_id || null,
      campanha_nome: body.campanha_nome || body.campaign_name || null,
      conjunto_nome: body.conjunto_nome || body.adset_name || null,
      anuncio_nome: body.anuncio_nome || body.ad_name || null,
      nascimento: body.nascimento || body.birthday || null,
    };

    const { data: inserted, error: iErr } = await supabase.from("leads").insert(lead).select().single();
    if (iErr) {
      return new Response(JSON.stringify({ error: iErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, lead: inserted }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
