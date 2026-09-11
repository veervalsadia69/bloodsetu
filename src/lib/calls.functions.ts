import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Masked call: the donor's number never leaves the server. We hand the
 * recipient a private bridge number to dial from their own phone; when the
 * bridge answers it connects them to the donor. Both sides see only the bridge.
 */
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

    const { data: donor } = await db
      .from("donors")
      .select("id, is_active")
      .eq("id", data.donorId)
      .eq("is_active", true)
      .maybeSingle();
    if (!donor) throw new Error("This donor is no longer listed.");

    const { twilioVoiceNumber } = await import("@/lib/twilio.server");
    const bridgeNumber = await twilioVoiceNumber();

    // Remember, briefly and privately, who this caller is about to reach.
    await db.from("call_bridge_sessions").insert({
      recipient_mobile: recipient.mobile,
      donor_id: donor.id,
    });

    // Record the contact so the recipient can see their recently called donors.
    await db.from("recipient_contact_logs").insert({
      recipient_verification_id: recipient.id,
      donor_id: donor.id,
    });

    // Only the shared bridge number is returned — never the donor's number.
    return { ok: true as const, bridgeNumber };
  });

/** The recipient's own log of the donors they contacted most recently. */
export const recentContacts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().trim().max(120).optional().default("") }).parse(data),
  )
  .handler(async ({ data }) => {
    if (!data.token) return { contacts: [] };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const { data: recipient } = await db
      .from("recipient_verifications")
      .select("id, verified, token_expires_at")
      .eq("access_token", data.token)
      .eq("verified", true)
      .maybeSingle();
    if (
      !recipient ||
      (recipient.token_expires_at && new Date(recipient.token_expires_at).getTime() < Date.now())
    ) {
      return { contacts: [] };
    }

    const { data: rows } = await db
      .from("recipient_contact_logs")
      .select("id, created_at, donor_id, donors(full_name, blood_type, city, neighborhood)")
      .eq("recipient_verification_id", recipient.id)
      .order("created_at", { ascending: false })
      .limit(3);

    type LogRow = {
      id: string;
      created_at: string;
      donor_id: string;
      donors: {
        full_name: string;
        blood_type: string;
        city: string;
        neighborhood: string;
      } | null;
    };

    return {
      contacts: ((rows ?? []) as unknown as LogRow[]).map((row) => ({
        id: row.id,
        donorId: row.donor_id,
        contactedAt: row.created_at,
        // Contact details stay masked — only the name/area the recipient already unlocked.
        donorName: row.donors?.full_name ?? "Donor removed",
        bloodType: row.donors?.blood_type ?? "—",
        city: row.donors?.city ?? "",
        neighborhood: row.donors?.neighborhood ?? "",
      })),
    };
  });
