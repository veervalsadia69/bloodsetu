import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// Public base URL Twilio can reach to fetch the call-bridge TwiML.
// The preview URL serves the latest build; update to the published/custom
// domain URL once the app is published.
const PUBLIC_BASE_URL = "https://id-preview--883202d5-9652-4d6a-bb12-413feb0379b9.lovable.app";

function bridgeSignature(donorId: string) {
  const secret = process.env["CALL_BRIDGE_SECRET"];
  if (!secret) throw new Error("Call bridge is not configured yet.");
  return createHmac("sha256", secret).update(donorId).digest("hex").slice(0, 32);
}

export function signedBridgeUrl(donorId: string, fromNumber: string) {
  return `${PUBLIC_BASE_URL}/api/public/call-bridge?donor=${encodeURIComponent(donorId)}&from=${encodeURIComponent(fromNumber)}&sig=${bridgeSignature(donorId)}`;
}

async function twilioRequest(path: string, method: "GET" | "POST", form?: URLSearchParams) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!lovableKey || !twilioKey) {
    throw new Error("Calling is not connected yet. Please try again soon.");
  }
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: form.toString() } : {}),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`Twilio request failed [${response.status}]: ${body}`);
    throw new Error(`The call could not be placed [${response.status}]. Please try again.`);
  }
  return body ? JSON.parse(body) : {};
}

export const callDonor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ token: z.string().trim().min(10).max(120), donorId: z.string().uuid() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    // Only a verified recipient with a valid access token may place a call.
    const { data: recipient } = await db
      .from("recipient_verifications")
      .select("id, mobile, verified, token_expires_at")
      .eq("access_token", data.token)
      .eq("verified", true)
      .maybeSingle();
    if (
      !recipient ||
      (recipient.token_expires_at && new Date(recipient.token_expires_at).getTime() < Date.now())
    ) {
      throw new Error("Please verify your identity again before calling a donor.");
    }

    // The donor's number is read server-side only and never sent to the browser.
    const { data: donor } = await db
      .from("donors")
      .select("id, contact_number, is_active")
      .eq("id", data.donorId)
      .eq("is_active", true)
      .maybeSingle();
    if (!donor) throw new Error("This donor is no longer listed.");

    const numbers = await twilioRequest("/IncomingPhoneNumbers.json?PageSize=1", "GET");
    const fromNumber = numbers?.incoming_phone_numbers?.[0]?.phone_number as string | undefined;
    if (!fromNumber) {
      throw new Error("Calling is not fully set up yet. Please try again soon.");
    }

    // Ring the recipient first; when they answer, Twilio fetches the bridge
    // URL which dials the donor — so neither side ever sees the other's number.
    await twilioRequest(
      "/Calls.json",
      "POST",
      new URLSearchParams({
        To: `+91${recipient.mobile}`,
        From: fromNumber,
        Url: signedBridgeUrl(donor.id, fromNumber),
        Timeout: "20",
      }),
    );

    return { ok: true as const };
  });
