import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";

// Twilio fetches this URL after the recipient answers. It returns TwiML that
// dials the donor, so the donor's real number is never exposed to the app UI.
// The `sig` parameter proves the URL was minted by our own server function.

function expectedSignature(donorId: string, secret: string) {
  return createHmac("sha256", secret).update(donorId).digest("hex").slice(0, 32);
}

export const Route = createFileRoute("/api/public/call-bridge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const donorId = url.searchParams.get("donor") ?? "";
        const sig = url.searchParams.get("sig") ?? "";
        const secret = process.env["CALL_BRIDGE_SECRET"];

        if (!secret || !/^[0-9a-f-]{36}$/i.test(donorId) || sig !== expectedSignature(donorId, secret)) {
          return new Response("Forbidden", { status: 403 });
        }

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: donor } = await db
          .from("donors")
          .select("contact_number, is_active")
          .eq("id", donorId)
          .maybeSingle();

        if (!donor?.is_active || !donor.contact_number) {
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Say>This donor is no longer available. Please choose another donor on BloodSetu.</Say></Response>`,
            { headers: { "Content-Type": "text/xml" } },
          );
        }

        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting you to your BloodSetu donor now.</Say><Dial callerId="${url.searchParams.get("From") ?? ""}">+91${donor.contact_number}</Dial></Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
      },
    },
  },
});
