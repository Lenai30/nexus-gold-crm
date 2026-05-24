// Manage Evolution API instance: create, qrcode, status, logout, delete
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
    const action = String(body.action || "");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: settings } = await admin
      .from("settings")
      .select("evolution_url, evolution_api_key, evolution_instance, webhook_token")
      .eq("user_id", userId).maybeSingle();

    if (!settings?.evolution_url || !settings.evolution_api_key) {
      return json({ error: "Configure URL e API Key da Evolution antes." }, 400);
    }

    const baseUrl = settings.evolution_url.replace(/\/$/, "");
    const apiKey = settings.evolution_api_key;
    const instance = body.instance || settings.evolution_instance;

    const evoFetch = (path: string, init: RequestInit = {}) =>
      fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", apikey: apiKey, ...(init.headers || {}) },
      });

    if (action === "create") {
      const instanceName = String(body.instance || "").trim();
      if (!instanceName) return json({ error: "Nome da instância obrigatório" }, 400);
      const webhookUrl = `${supabaseUrl}/functions/v1/wa-webhook?token=${settings.webhook_token}`;

      const payload = {
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: false,
        syncFullHistory: false,
        rejectCall: false,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        },
      };
      const res = await evoFetch("/instance/create", { method: "POST", body: JSON.stringify(payload) });
      const text = await res.text();
      if (!res.ok) {
        // If already exists, just set webhook + return success
        if (res.status === 403 || /already in use|exists/i.test(text)) {
          await evoFetch(`/webhook/set/${instanceName}`, {
            method: "POST",
            body: JSON.stringify({
              webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: false, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"] },
            }),
          }).catch(() => {});
        } else {
          return json({ error: `Evolution: ${res.status} ${text}` }, 502);
        }
      }
      await admin.from("settings").update({ evolution_instance: instanceName }).eq("user_id", userId);
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      return json({ success: true, instance: instanceName, data: parsed });
    }

    if (!instance) return json({ error: "Instância não definida" }, 400);

    if (action === "qrcode") {
      const res = await evoFetch(`/instance/connect/${instance}`, { method: "GET" });
      const text = await res.text();
      if (!res.ok) return json({ error: `Evolution: ${res.status} ${text}` }, 502);
      let data: any = {}; try { data = JSON.parse(text); } catch { /* */ }
      return json({ success: true, qrcode: data.base64 || data.code || data.qrcode || null, raw: data });
    }

    if (action === "status") {
      const res = await evoFetch(`/instance/connectionState/${instance}`, { method: "GET" });
      const text = await res.text();
      let data: any = {}; try { data = JSON.parse(text); } catch { /* */ }
      return json({ success: res.ok, state: data?.instance?.state || data?.state || "unknown", raw: data });
    }

    if (action === "logout") {
      const res = await evoFetch(`/instance/logout/${instance}`, { method: "DELETE" });
      return json({ success: res.ok });
    }

    if (action === "delete") {
      const res = await evoFetch(`/instance/delete/${instance}`, { method: "DELETE" });
      await admin.from("settings").update({ evolution_instance: null }).eq("user_id", userId);
      return json({ success: res.ok });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
