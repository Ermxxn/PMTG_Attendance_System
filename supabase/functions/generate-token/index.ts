// supabase/functions/generate-token/index.ts
// Public endpoint the DISPLAY screen polls every 15s to get the current QR value.
// The event secret never leaves this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIME_STEP = 15; // seconds — must match check-in/index.ts

async function hmacToken(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let code = 0;
  for (let i = 0; i < 4; i++) code = (code << 8) | bytes[i];
  code = Math.abs(code) % 100000000;
  return code.toString().padStart(8, "0");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const eventId = url.searchParams.get("event_id");
  if (!eventId) {
    return new Response(JSON.stringify({ error: "event_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: event, error } = await supabase
    .from("events")
    .select("id, secret")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return new Response(JSON.stringify({ error: "event not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const window = Math.floor(Date.now() / 1000 / TIME_STEP);
  const token = await hmacToken(event.secret, `${eventId}:${window}`);
  const expiresIn = TIME_STEP - (Math.floor(Date.now() / 1000) % TIME_STEP);

  return new Response(
    JSON.stringify({ token, window, expires_in: expiresIn, time_step: TIME_STEP }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
