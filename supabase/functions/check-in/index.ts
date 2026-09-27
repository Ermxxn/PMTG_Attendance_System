// supabase/functions/check-in/index.ts
// Public endpoint called by checkin.html (QR scan) and later by the admin
// page (manual entry, method: "admin_manual" skips token/geofence checks).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIME_STEP = 15;          // seconds — must match generate-token/index.ts
const TOLERANCE_WINDOWS = 1;   // accept current window and 1 before it (clock drift / scan lag)

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

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { event_id, token, full_name, class: className, matric_no, gps_lat, gps_lng, method } = body;

  if (!event_id || !full_name || !className || !matric_no) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
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
    .select("*")
    .eq("id", event_id)
    .single();

  if (error || !event) {
    return new Response(JSON.stringify({ error: "Event not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isManual = method === "admin_manual";

  if (!isManual) {
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing QR token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentWindow = Math.floor(Date.now() / 1000 / TIME_STEP);
    let valid = false;
    for (let w = currentWindow - TOLERANCE_WINDOWS; w <= currentWindow; w++) {
      const expected = await hmacToken(event.secret, `${event_id}:${w}`);
      if (expected === token) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      return new Response(JSON.stringify({ error: "This QR code has expired. Please rescan." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.venue_lat != null && event.venue_lng != null) {
      if (gps_lat == null || gps_lng == null) {
        return new Response(JSON.stringify({ error: "Location is required to check in" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const dist = distanceMeters(gps_lat, gps_lng, event.venue_lat, event.venue_lng);
      if (dist > (event.geofence_radius_m ?? 200)) {
        return new Response(JSON.stringify({ error: "You must be at the venue to check in" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  const { error: insertError } = await supabase.from("attendance").insert({
    event_id,
    full_name: String(full_name).toUpperCase().trim(),
    class: String(className).toUpperCase().trim(),
    matric_no: String(matric_no).toUpperCase().trim(),
    gps_lat: gps_lat ?? null,
    gps_lng: gps_lng ?? null,
    method: isManual ? "admin_manual" : "qr_scan",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({ error: "This matric number has already checked in" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
