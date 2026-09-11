import { createFileRoute } from "@tanstack/react-router";

/**
 * Twilio webhook that bridges a verified recipient's call to the donor.
 * Twilio fetches this URL when the recipient answers; it must be called with a
 * valid HMAC signature (created server-side in callDonor). The donor's number
 * is read from the database here and never sent to any browser.
 */

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

async function handle(request: Request) {
  const url = new URL(request.url);
  // Twilio may POST form fields; query params carry our signed payload either way.
  const donorId = url.searchParams.get("d") ?? "";
  const recipient = url.searchParams.get("r") ?? "";
  const sig = url.searchParams.get("s") ?? "";

  if (!/^[0-9a-f-]{36}$/i.test(donorId) || !/^\+91\d{10}$/.test(recipient) || !sig) {
    return twiml(`<Say>Sorry, this call could not be connected.</Say><Hangup/>`);
  }

  const secret = process.env["CALL_BRIDGE_SECRET"];
  if (!secret) return twiml(`<Say>Calling is not configured yet.</Say><Hangup/>`);

  const expected = await hmacHex(secret, `${donorId}|${recipient}`);
  if (expected.length !== sig.length) {
    return twiml(`<Say>Sorry, this call could not be connected.</Say><Hangup/>`);
  }
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) {
    return twiml(`<Say>Sorry, this call could not be connected.</Say><Hangup/>`);
  }

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: donor } = await db
    .from("donors")
    .select("contact_number, is_active")
    .eq("id", donorId)
    .eq("is_active", true)
    .maybeSingle();

  if (!donor) {
    return twiml(`<Say>Sorry, this donor is no longer available.</Say><Hangup/>`);
  }

  const from = url.searchParams.get("f") ?? "";
  const callerId = /^\+[1-9]\d{7,14}$/.test(from) ? from : undefined;
  const dial = callerId ? `<Dial callerId="${callerId}">` : "<Dial>";
  return twiml(
    `<Say>Connecting you to your BloodSetu donor. Both numbers stay private.</Say>${dial}+91${donor.contact_number}</Dial>`,
  );
}

export const Route = createFileRoute("/api/public/call-bridge")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
