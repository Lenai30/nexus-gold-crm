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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings, error: sErr } = await supabase
      .from("settings")
      .select("user_id")
      .eq("webhook_token", token)
      .maybeSingle();

    if (sErr || !settings) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const nome = body.nome || body.name || body.full_name || body.Name;
    const whatsapp = body.whatsapp || body.phone || body.telefone || body.Whatsapp;

    if (!nome || !whatsapp) {
      return new Response(JSON.stringify({ error: "nome e whatsapp obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse status (accept English/PT variants)
    const statusMap: Record<string, string> = {
      "new": "novos", "novo": "novos", "novos": "novos",
      "negotiation": "negociacao", "negociacao": "negociacao", "negociação": "negociacao",
      "followup": "followup", "follow-up": "followup", "follow_up": "followup",
      "posvenda": "posvenda", "pos-venda": "posvenda", "post-sale": "posvenda",
    };
    const rawStatus = String(body.status || "novos").toLowerCase().trim();
    const status = statusMap[rawStatus] || "novos";

    // Parse campaign info - n8n may send campanha_id as a long descriptive string
    const rawCampanhaId = body.campanha_id || body.campaign_id || null;
    const campanhaNome = body.campanha_nome || body.campaign_name || rawCampanhaId || null;

    const lead = {
      user_id: settings.user_id,
      nome: String(nome).slice(0, 200),
      whatsapp: String(whatsapp).slice(0, 30),
      origem: body.origem || body.source || body.Origin || body.origin || "Webhook n8n",
      origem_tag: body.origem_tag === "paid" ? "paid" : "organic",
      score: Math.min(5, Math.max(1, parseInt(body.score) || 3)),
      status,
      notas: body.notas || body.notes || body.Notes || null,
      campanha_id: rawCampanhaId ? String(rawCampanhaId).slice(0, 500) : null,
      campanha_nome: campanhaNome ? String(campanhaNome).slice(0, 500) : null,
      conjunto_nome: body.conjunto_nome || body.adset_name || null,
      anuncio_nome: body.anuncio_nome || body.ad_name || null,
      nascimento: (() => {
        const raw = body.nascimento || body.birthday || body.birth || body.data;
        if (!raw) return null;
        const s = String(raw).trim();
        if (!s) return null;
        const m = s.match(/^\d{4}-\d{2}-\d{2}/);
        return m ? m[0] : null;
      })(),
    };

    const { data: inserted, error: iErr } = await supabase.from("leads").insert(lead).select().single();
    if (iErr) {
      return new Response(JSON.stringify({ error: iErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
