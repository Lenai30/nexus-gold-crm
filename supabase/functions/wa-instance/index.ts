// Manage Evolution API instance per user.
// Evolution URL + API key are GLOBAL secrets (hidden from users).
// Each user has an auto-generated instance: user_<first12chars-of-uuid>
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const instanceFor = (userId: string) => `user_${userId.replace(/-/g, "").slice(0, 12)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evoBase = (Deno.env.get("EVOLUTION_URL") || "").replace(/\/$/, "");
    const evoKey = Deno.env.get("EVOLUTION_API_KEY") || "";

    if (!evoBase || !evoKey) return json({ error: "Evolution não configurada no servidor" }, 500);

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
      .select("evolution_instance, webhook_token")
      .eq("user_id", userId).maybeSingle();

    const instance = settings?.evolution_instance || instanceFor(userId);
    const webhookUrl = `${supabaseUrl}/functions/v1/wa-webhook?token=${settings?.webhook_token}`;

    const evoFetch = (path: string, init: RequestInit = {}) =>
      fetch(`${evoBase}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", apikey: evoKey, ...(init.headers || {}) },
      });

    const ensureWebhook = async () => {
      await evoFetch(`/webhook/set/${instance}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          },
        }),
      }).catch(() => null);
    };

    // CONNECT: create-if-missing + ensure webhook + return QR
    if (action === "connect" || action === "create") {
      // Try create
      const createRes = await evoFetch("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false,
          rejectCall: false,
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          },
        }),
      });
      const createText = await createRes.text();
      let createData: any = null; try { createData = JSON.parse(createText); } catch { /* */ }

      if (!createRes.ok && !/already in use|exists|already/i.test(createText) && createRes.status !== 403) {
        return json({ error: `Evolution: ${createRes.status} ${createText}` }, 502);
      }

      // Save instance name + ensure webhook
      await admin.from("settings").update({ evolution_instance: instance }).eq("user_id", userId);
      await ensureWebhook();

      // Get QR (create returns qrcode sometimes; else call connect)
      let qrcode: string | null =
        createData?.qrcode?.base64 || createData?.qrcode?.code || createData?.base64 || null;

      if (!qrcode) {
        const qrRes = await evoFetch(`/instance/connect/${instance}`, { method: "GET" });
        const qrText = await qrRes.text();
        let qrData: any = {}; try { qrData = JSON.parse(qrText); } catch { /* */ }
        qrcode = qrData?.base64 || qrData?.code || qrData?.qrcode || null;
      }

      return json({ success: true, instance, qrcode });
    }

    if (action === "qrcode") {
      const res = await evoFetch(`/instance/connect/${instance}`, { method: "GET" });
      const text = await res.text();
      if (!res.ok) return json({ error: `Evolution: ${res.status} ${text}` }, 502);
      let data: any = {}; try { data = JSON.parse(text); } catch { /* */ }
      return json({ success: true, qrcode: data.base64 || data.code || data.qrcode || null });
    }

    if (action === "status") {
      const res = await evoFetch(`/instance/connectionState/${instance}`, { method: "GET" });
      const text = await res.text();
      let data: any = {}; try { data = JSON.parse(text); } catch { /* */ }
      return json({ success: res.ok, state: data?.instance?.state || data?.state || "unknown" });
    }

    if (action === "logout") {
      const res = await evoFetch(`/instance/logout/${instance}`, { method: "DELETE" });
      return json({ success: res.ok });
    }

    if (action === "delete") {
      await evoFetch(`/instance/logout/${instance}`, { method: "DELETE" }).catch(() => null);
      const res = await evoFetch(`/instance/delete/${instance}`, { method: "DELETE" });
      await admin.from("settings").update({ evolution_instance: null }).eq("user_id", userId);
      return json({ success: res.ok });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
