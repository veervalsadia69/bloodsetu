export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const GENDERS = ["Male", "Female", "Other"] as const;

export const COOLDOWN_DAYS = 90;

export const ACCESS_TOKEN_KEY = "raktsetu.recipient_token";

export type DonorCard = {
  id: string;
  bloodType: string;
  city: string;
  neighborhood: string;
  age: number;
  gender: string;
  available: boolean;
  nextEligibleDate: string | null;
  // Only present once the recipient has completed OTP verification.
  fullName?: string;
  contactNumber?: string;
  medicalConditions?: string | null;
  lastDonationDate?: string | null;
};

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value?: string | null) {
  if (!value) return "Never donated";
  return new Date(value + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
