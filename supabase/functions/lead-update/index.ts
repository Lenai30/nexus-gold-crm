// Lead update endpoint for n8n agent tool
// POST /functions/v1/lead-update?token=<webhook_token>
// Body: { whatsapp: string, status?: "novos"|"negociacao"|"followup"|"posvenda", notas?: string, prox_acao?: string, score?: number }
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const digits = (s: string) => String(s || "").replace(/\D/g, "");
const VALID_STATUS = ["novos", "negociacao", "followup", "posvenda"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as any));
    const token = url.searchParams.get("token") || body.token || "";
    const whatsapp = body.whatsapp || body.number || body.phone || url.searchParams.get("whatsapp") || "";
    const status = body.status;
    const notas = body.notas;
    const prox_acao = body.prox_acao;
    const score = body.score;

    if (!token) return json({ error: "Missing token" }, 401);
    if (!whatsapp) return json({ error: "Missing whatsapp" }, 400);
    if (status && !VALID_STATUS.includes(status))
      return json({ error: `Invalid status. Use: ${VALID_STATUS.join(", ")}` }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase.from("settings")
      .select("user_id").eq("webhook_token", token).maybeSingle();
    if (!settings) return json({ error: "Invalid token" }, 401);
    const userId = settings.user_id;

    const tail = digits(whatsapp).slice(-10);
    const { data: leads } = await supabase.from("leads")
      .select("id, whatsapp, status").eq("user_id", userId);
    const lead = (leads || []).find(l => digits(l.whatsapp).endsWith(tail));
    if (!lead) return json({ error: "Lead not found", whatsapp }, 404);

    const patch: Record<string, unknown> = { last_interaction: new Date().toISOString() };
    if (status) patch.status = status;
    if (typeof notas === "string") patch.notas = notas;
    if (typeof prox_acao === "string") patch.prox_acao = prox_acao;
    if (typeof score === "number") patch.score = Math.min(5, Math.max(1, score));

    const { data: updated, error } = await supabase.from("leads")
      .update(patch).eq("id", lead.id).select().maybeSingle();
    if (error) return json({ error: error.message }, 500);

    return json({
      success: true,
      previous_status: lead.status,
      lead: updated,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
