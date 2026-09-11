import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { BLOOD_TYPES } from "./donor-shared";

/** Profile + stock for the signed-in hospital. Creates the profile shell on first visit. */
export const getHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let { data: hospital } = await supabase
      .from("hospitals")
      .select("id, name, city, contact_number")
      .eq("user_id", userId)
      .maybeSingle();

    if (!hospital) {
      const created = await supabase
        .from("hospitals")
        .insert({ user_id: userId, name: "", city: "", contact_number: "" })
        .select("id, name, city, contact_number")
        .single();
      if (created.error) throw new Error("Could not open your hospital profile.");
      hospital = created.data;
    }

    const { data: stock } = await supabase
      .from("blood_stock")
      .select("blood_type, units")
      .eq("hospital_id", hospital.id);

    const units = new Map((stock ?? []).map((row) => [row.blood_type, row.units]));

    return {
      hospital: {
        id: hospital.id,
        name: hospital.name,
        city: hospital.city,
        contactNumber: hospital.contact_number,
      },
      stock: BLOOD_TYPES.map((bloodType) => ({
        bloodType,
        units: units.get(bloodType) ?? 0,
      })),
    };
  });

export const saveHospitalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        city: z.string().trim().min(2).max(60),
        contactNumber: z
          .string()
          .trim()
          .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("hospitals")
      .update({ name: data.name, city: data.city, contact_number: data.contactNumber })
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not save your hospital details.");
    return { ok: true as const };
  });

export const setBloodStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        bloodType: z.enum(BLOOD_TYPES),
        units: z.coerce.number().int().min(0).max(9999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: hospital } = await context.supabase
      .from("hospitals")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!hospital) throw new Error("Please save your hospital details first.");

    const { error } = await context.supabase
      .from("blood_stock")
      .upsert(
        { hospital_id: hospital.id, blood_type: data.bloodType, units: data.units },
        { onConflict: "hospital_id,blood_type" },
      );
    if (error) throw new Error("Could not update this blood group's stock.");
    return { ok: true as const };
  });

/** Donor lookup for hospitals, so they can record a donation they just handled. */
export const hospitalFindDonors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().trim().max(80).optional().default("") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: hospital } = await context.supabase
      .from("hospitals")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!hospital) throw new Error("Please save your hospital details first.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("donors")
      .select("id, full_name, blood_type, city, neighborhood, contact_number, last_donation_date")
      .order("full_name")
      .limit(25);
    if (data.query) {
      query = query.or(
        `full_name.ilike.%${data.query}%,contact_number.ilike.%${data.query}%,city.ilike.%${data.query}%`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load donors right now.");

    return (rows ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      bloodType: row.blood_type,
      city: row.city,
      neighborhood: row.neighborhood,
      contactNumber: row.contact_number,
      lastDonationDate: row.last_donation_date,
    }));
  });

export const hospitalUpdateDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        donorId: z.string().uuid(),
        lastDonationDate: z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: hospital } = await context.supabase
      .from("hospitals")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!hospital) throw new Error("Please save your hospital details first.");

    if (new Date(data.lastDonationDate + "T00:00:00Z").getTime() > Date.now()) {
      throw new Error("A donation date cannot be in the future.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("donors")
      .update({ last_donation_date: data.lastDonationDate })
      .eq("id", data.donorId);
    if (error) throw new Error("Could not update this donor's donation date.");
    return { ok: true as const };
  });
