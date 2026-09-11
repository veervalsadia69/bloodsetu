import { createHmac, randomInt, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

function secret() {
  return process.env["CALL_BRIDGE_SECRET"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "bloodsetu";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export type CaptchaChallenge = { question: string; challenge: string };

export function createCaptcha(): CaptchaChallenge {
  const a = randomInt(2, 13);
  const b = randomInt(2, 13);
  const plus = randomInt(0, 2) === 1 || b > a;
  const answer = plus ? a + b : a - b;
  const payload = `${answer}.${Date.now() + TTL_MS}`;
  return {
    question: plus ? `${a} + ${b}` : `${a} − ${b}`,
    challenge: `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`,
  };
}

export function verifyCaptcha(challenge: string, answer: string): boolean {
  const parts = challenge.split(".");
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts as [string, string];
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return false;
  const [value, expiry] = payload.split(".") as [string, string];
  if (Number(expiry) < Date.now()) return false;
  return value.trim() === answer.trim();
}
