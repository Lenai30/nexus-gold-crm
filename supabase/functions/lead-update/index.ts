// Lead update endpoint for n8n AI Agent Tool (Function Calling)
// POST /functions/v1/lead-update?token=<webhook_token>
// Body: { whatsapp: string, status: "novos"|"negociacao"|"followup"|"posvenda" | label, notas?, prox_acao?, score? }
//
// SECURITY / MULTI-TENANT ISOLATION:
// 1. The `token` in the query string identifies the tenant (settings.webhook_token -> user_id).
// 2. The UPDATE is ALWAYS scoped by user_id = <tenant owner> AND whatsapp match,
//    so an agent serving Tenant A can NEVER touch Tenant B's leads, even if it
//    sends the same whatsapp number. No cross-tenant leakage is possible.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const digits = (s: string) => String(s || "").replace(/\D/g, "");

// Accept both internal keys AND human/AI-friendly Portuguese labels.
const STATUS_MAP: Record<string, string> = {
  "novos": "novos",
  "novo": "novos",
  "new": "novos",
  "negociacao": "negociacao",
  "negociação": "negociacao",
  "em negociacao": "negociacao",
  "em negociação": "negociacao",
  "negotiation": "negociacao",
  "followup": "followup",
  "follow-up": "followup",
  "follow up": "followup",
  "posvenda": "posvenda",
  "pos-venda": "posvenda",
  "pós-venda": "posvenda",
  "pos venda": "posvenda",
  "pós venda": "posvenda",
};

const STATUS_LABEL: Record<string, string> = {
  novos: "Novos",
  negociacao: "Em Negociação",
  followup: "Follow-up",
  posvenda: "Pós-Venda",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as any));

    const token = url.searchParams.get("token") || body.token || "";
    const whatsappRaw = body.whatsapp || body.number || body.phone || url.searchParams.get("whatsapp") || "";
    const statusRaw = body.status;
    const notas = body.notas;
    const prox_acao = body.prox_acao;
    const score = body.score;

    if (!token) return json({ success: false, error: "Missing token" }, 401);
    if (!whatsappRaw) return json({ success: false, error: "Missing whatsapp" }, 400);

    let status: string | undefined;
    if (statusRaw !== undefined && statusRaw !== null && String(statusRaw).trim() !== "") {
      const key = String(statusRaw).trim().toLowerCase();
      status = STATUS_MAP[key];
      if (!status) {
        return json({
          success: false,
          error: `Status inválido: "${statusRaw}". Use um destes: novos, negociacao, followup, posvenda (ou seus rótulos: Novos, Em Negociação, Follow-up, Pós-Venda).`,
        }, 400);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Resolve tenant from token. This is the ONLY way to determine which
    //    user_id this request is allowed to touch.
    const { data: settings, error: settingsErr } = await supabase
      .from("settings")
      .select("user_id")
      .eq("webhook_token", token)
      .maybeSingle();
    if (settingsErr) return json({ success: false, error: settingsErr.message }, 500);
    if (!settings) return json({ success: false, error: "Invalid token" }, 401);
    const userId = settings.user_id;

    // 2) Find the lead STRICTLY within this tenant. Match by last 10 digits of whatsapp.
    const tail = digits(whatsappRaw).slice(-10);
    if (!tail) return json({ success: false, error: "Invalid whatsapp" }, 400);

    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, whatsapp, status, nome")
      .eq("user_id", userId); // <-- tenant scope
    if (leadsErr) return json({ success: false, error: leadsErr.message }, 500);

    const lead = (leads || []).find((l) => digits(l.whatsapp).endsWith(tail));
    if (!lead) {
      return json({
        success: false,
        message: `Nenhum lead com WhatsApp ${whatsappRaw} foi encontrado na base deste usuário.`,
      }, 404);
    }

    // 3) Build patch. last_interaction is always bumped on any agent action.
    const patch: Record<string, unknown> = { last_interaction: new Date().toISOString() };
    if (status) patch.status = status;
    if (typeof notas === "string") patch.notas = notas;
    if (typeof prox_acao === "string") patch.prox_acao = prox_acao;
    if (typeof score === "number") patch.score = Math.min(5, Math.max(1, score));

    // 4) UPDATE is double-scoped: id = lead.id (already tenant-scoped above) AND user_id = userId.
    //    Even if the lead.id were tampered with, the user_id filter blocks cross-tenant writes.
    const { data: updated, error: updErr } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", lead.id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (updErr) return json({ success: false, error: updErr.message }, 500);
    if (!updated) {
      return json({ success: false, error: "Update bloqueado: lead não pertence a este usuário." }, 403);
    }

    const label = status ? STATUS_LABEL[status] : STATUS_LABEL[lead.status] || lead.status;
    const message = status
      ? `O lead ${lead.nome || ""} (WhatsApp ${whatsappRaw}) foi atualizado com sucesso para o status "${label}" no banco isolado deste usuário.`.replace(/\s+/g, " ").trim()
      : `O lead ${lead.nome || ""} (WhatsApp ${whatsappRaw}) foi atualizado com sucesso no banco isolado deste usuário.`.replace(/\s+/g, " ").trim();

    return json({
      success: true,
      message,
      previous_status: lead.status,
      lead: updated,
    });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
