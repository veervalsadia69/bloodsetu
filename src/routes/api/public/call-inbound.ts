import { createFileRoute } from "@tanstack/react-router";

/**
 * Twilio inbound webhook. A verified recipient dials our bridge number from
 * their own phone; we look up the donor they just tapped and connect the call.
 * The donor's number is read server-side and never reaches any browser.
 */

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

async function callerNumber(request: Request) {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("From");
  if (fromQuery) return fromQuery;
  try {
    const form = await request.formData();
    return String(form.get("From") ?? "");
  } catch {
    return "";
  }
}

async function handle(request: Request) {
  const from = await callerNumber(request);
  const mobile = /^\+91(\d{10})$/.exec(from)?.[1];
  if (!mobile) {
    return twiml(`<Say>Sorry, this call could not be connected.</Say><Hangup/>`);
  }

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: session } = await db
    .from("call_bridge_sessions")
    .select("id, donor_id, expires_at")
    .eq("recipient_mobile", mobile)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return twiml(
      `<Say>Please open BloodSetu and tap call donor again to connect.</Say><Hangup/>`,
    );
  }

  const { data: donor } = await db
    .from("donors")
    .select("contact_number, is_active")
    .eq("id", session.donor_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!donor) {
    return twiml(`<Say>Sorry, this donor is no longer available.</Say><Hangup/>`);
  }

  return twiml(
    `<Say>Connecting you to your BloodSetu donor. Both numbers stay private.</Say><Dial>+91${donor.contact_number}</Dial>`,
  );
}

export const Route = createFileRoute("/api/public/call-inbound")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
