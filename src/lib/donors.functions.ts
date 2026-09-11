import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "crypto";
import { z } from "zod";

import { BLOOD_TYPES, COOLDOWN_DAYS, GENDERS, type DonorCard } from "./donor-shared";

type DonorRow = {
  id: string;
  donor_code: string;
  full_name: string;
  blood_type: string;
  last_donation_date: string | null;
  medical_conditions: string | null;
  age: number;
  gender: string;
  city: string;
  neighborhood: string;
  contact_number: string;
  is_active: boolean;
  created_at: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}


function maskName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + "•".repeat(Math.max(part.length - 1, 1)))
    .join(" ");
}

function eligibility(lastDonation: string | null) {
  if (!lastDonation) return { available: true, nextEligibleDate: null as string | null };
  const next = new Date(lastDonation + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + COOLDOWN_DAYS);
  const available = next.getTime() <= Date.now();
  return { available, nextEligibleDate: available ? null : next.toISOString().slice(0, 10) };
}

function toCard(row: DonorRow, reveal: boolean): DonorCard & { maskedName: string } {
  const { available, nextEligibleDate } = eligibility(row.last_donation_date);
  const base = {
    id: row.id,
    donorCode: row.donor_code,
    maskedName: maskName(row.full_name),
    bloodType: row.blood_type,
    city: row.city,
    neighborhood: row.neighborhood,
    age: row.age,
    gender: row.gender,
    available,
    nextEligibleDate,
  };
  if (!reveal || !available) return base;
  return {
    ...base,
    fullName: row.full_name,
    medicalConditions: row.medical_conditions,
    lastDonationDate: row.last_donation_date,
  };
}

const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

/* ------------------------------- donors ------------------------------- */

const donorSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  bloodType: z.enum(BLOOD_TYPES),
  lastDonationDate: z.string().trim().optional().nullable(),
  medicalConditions: z.string().trim().max(500).optional().nullable(),
  age: z.coerce.number().int().min(18).max(65),
  gender: z.enum(GENDERS),
  city: z.string().trim().min(2).max(60),
  neighborhood: z.string().trim().min(2).max(60),
  contactNumber: phone,
});

export const registerDonor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => donorSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: inserted, error } = await db
      .from("donors")
      .insert({
      full_name: data.fullName,
      blood_type: data.bloodType,
      last_donation_date: data.lastDonationDate ? data.lastDonationDate : null,
      medical_conditions: data.medicalConditions || null,
      age: data.age,
      gender: data.gender,
      city: data.city,
      neighborhood: data.neighborhood,
        contact_number: data.contactNumber,
      })
      .select("donor_code")
      .single();
    if (error) throw new Error("Could not save your details. Please try again.");
    const { available, nextEligibleDate } = eligibility(
      data.lastDonationDate ? data.lastDonationDate : null,
    );
    return {
      ok: true as const,
      donorCode: (inserted as { donor_code: string } | null)?.donor_code ?? "",
      available,
      nextEligibleDate,
    };
  });

const searchSchema = z.object({
  bloodType: z.enum(BLOOD_TYPES),
  city: z.string().trim().max(60).optional().default(""),
  neighborhood: z.string().trim().max(60).optional().default(""),
  token: z.string().trim().max(120).optional().default(""),
});

async function tokenIsValid(token: string) {
  if (!token) return null;
  const db = await admin();
  const { data } = await db
    .from("recipient_verifications")
    .select("id, full_name, verified, token_expires_at")
    .eq("access_token", token)
    .maybeSingle();
  if (!data || !data.verified) return null;
  if (data.token_expires_at && new Date(data.token_expires_at).getTime() < Date.now()) return null;
  return data as { id: string; full_name: string };
}

export const searchDonors = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const verified = await tokenIsValid(data.token);

    let query = db
      .from("donors")
      .select("*")
      .eq("is_active", true)
      .eq("blood_type", data.bloodType);
    if (data.city) query = query.ilike("city", `%${data.city}%`);

    const { data: rows, error } = await query.limit(200);
    if (error) throw new Error("Search failed. Please try again.");

    const area = data.neighborhood.trim().toLowerCase();
    const cards = (rows as DonorRow[]).map((row) => ({
      card: toCard(row, Boolean(verified)),
      rank: area
        ? row.neighborhood.toLowerCase() === area
          ? 0
          : row.neighborhood.toLowerCase().includes(area) ||
              area.includes(row.neighborhood.toLowerCase())
            ? 1
            : 2
        : 1,
    }));

    cards.sort((a, b) => {
      if (a.card.available !== b.card.available) return a.card.available ? -1 : 1;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.card.neighborhood.localeCompare(b.card.neighborhood);
    });

    return {
      verified: Boolean(verified),
      recipientName: verified?.full_name ?? null,
      donors: cards.map((entry) => entry.card),
    };
  });

/* ----------------------- hospitals with stock ----------------------- */

export const searchHospitalStock = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        bloodType: z.enum(BLOOD_TYPES),
        city: z.string().trim().max(60).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    let hospitalQuery = db
      .from("hospitals")
      .select("id, name, city, contact_number")
      .neq("name", "");
    if (data.city) hospitalQuery = hospitalQuery.ilike("city", `%${data.city}%`);
    const { data: hospitals, error } = await hospitalQuery.limit(50);
    if (error) throw new Error("Could not load hospitals right now.");

    const ids = (hospitals ?? []).map((h) => h.id);
    if (ids.length === 0) return { hospitals: [] as never[] };

    const { data: stock } = await db
      .from("blood_stock")
      .select("hospital_id, units")
      .eq("blood_type", data.bloodType)
      .gt("units", 0)
      .in("hospital_id", ids);

    const unitsById = new Map((stock ?? []).map((row) => [row.hospital_id, row.units]));
    return {
      hospitals: (hospitals ?? [])
        .filter((h) => unitsById.has(h.id))
        .map((h) => ({
          id: h.id,
          name: h.name,
          city: h.city,
          contactNumber: h.contact_number,
          units: unitsById.get(h.id) ?? 0,
        }))
        .sort((a, b) => b.units - a.units),
    };
  });

/* --------------------------- verification --------------------------- */

export const getCaptcha = createServerFn({ method: "GET" }).handler(async () => {
  const { createCaptcha } = await import("./captcha.server");
  return createCaptcha();
});

const startSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: phone,
  captchaChallenge: z.string().trim().min(10).max(400),
  captchaAnswer: z
    .string()
    .trim()
    .regex(/^-?\d{1,3}$/, "Enter the answer to the security check"),
  faceImage: z
    .string()
    .trim()
    .refine(
      (value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
      "A live camera photo is required",
    )
    .refine((value) => value.length > 2000, "The camera photo did not capture correctly")
    .refine((value) => value.length < 4_000_000, "That photo is too large"),
});

export const startVerification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyCaptcha } = await import("./captcha.server");
    if (!verifyCaptcha(data.captchaChallenge, data.captchaAnswer))
      throw new Error("That security check answer is not correct. Please try the new one.");

    const db = await admin();

    const [meta, base64] = data.faceImage.split(",") as [string, string];
    const contentType = meta.slice(5, meta.indexOf(";"));
    const extension = contentType.split("/")[1] ?? "jpg";
    const path = `${new Date().toISOString().slice(0, 10)}/${randomBytes(12).toString("hex")}.${extension}`;
    const upload = await db.storage
      .from("recipient-faces")
      .upload(path, Buffer.from(base64, "base64"), { contentType, upsert: false });
    if (upload.error) throw new Error("Could not save your photo. Please try again.");

    const token = randomBytes(24).toString("hex");
    const { error } = await db.from("recipient_verifications").insert({
      full_name: data.fullName,
      mobile: data.mobile,
      face_image_path: path,
      otp_hash: null,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verified: true,
      access_token: token,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error("Could not complete verification. Please try again.");

    return { token };
  });

export const checkToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().trim().max(120) }).parse(data))
  .handler(async ({ data }) => {
    const verified = await tokenIsValid(data.token);
    return { verified: Boolean(verified), recipientName: verified?.full_name ?? null };
  });

/* ------------------------------- admin ------------------------------- */

function assertAdmin(code: string) {
  const expected = process.env["ADMIN_ACCESS_CODE"];
  if (!expected) throw new Error("Admin access code is not configured yet.");
  if (code !== expected) throw new Error("Incorrect admin access code.");
}

export const listDonorsAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ code: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data }) => {
    assertAdmin(data.code);
    const db = await admin();
    const { data: rows, error } = await db
      .from("donors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Could not load donor records.");
    return (rows as DonorRow[]).map((row) => ({
      id: row.id,
      donorCode: row.donor_code,
      fullName: row.full_name,
      bloodType: row.blood_type,
      age: row.age,
      gender: row.gender,
      city: row.city,
      neighborhood: row.neighborhood,
      contactNumber: row.contact_number,
      medicalConditions: row.medical_conditions,
      lastDonationDate: row.last_donation_date,
      isActive: row.is_active,
      ...eligibility(row.last_donation_date),
    }));
  });

export const setDonorActive = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ code: z.string().trim().min(1), id: z.string().uuid(), isActive: z.boolean() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.code);
    const db = await admin();
    const { error } = await db.from("donors").update({ is_active: data.isActive }).eq("id", data.id);
    if (error) throw new Error("Could not update this donor.");
    return { ok: true as const };
  });

export const deleteDonorAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().min(1), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.code);
    const db = await admin();
    const { error } = await db.from("donors").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete this donor.");
    return { ok: true as const };
  });
