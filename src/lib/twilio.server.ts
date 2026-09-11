const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

/** Calls the Twilio API through the Lovable connector gateway (server-only). */
export async function twilioForm(
  path: string,
  method: "GET" | "POST",
  form?: URLSearchParams,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!lovableKey || !twilioKey) {
    throw new Error("Text messaging is not connected yet. Please try again soon.");
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
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    console.error(`Twilio request failed [${response.status}] ${path}: ${text}`);
  }
  return { ok: response.ok, status: response.status, body };
}

function verifyServiceSid() {
  const sid = process.env["TWILIO_VERIFY_SERVICE_SID"];
  if (!sid) throw new Error("Text messaging is not configured yet. Please try again soon.");
  return sid;
}

/** Sends a one-time code by SMS to an Indian mobile number. */
export async function sendSmsCode(mobile10: string) {
  const result = await twilioForm(
    `/verify/v2/Services/${verifyServiceSid()}/Verifications`,
    "POST",
    new URLSearchParams({ To: `+91${mobile10}`, Channel: "sms" }),
  );
  if (!result.ok) {
    const message = String(result.body["message"] ?? "");
    if (result.status === 429) {
      throw new Error("Too many code requests. Please wait a minute and try again.");
    }
    if (result.body["code"] === 21608 || /verified tester/i.test(message)) {
      throw new Error(
        "Our messaging account is still on a trial plan, so it can only text numbers that have been approved for testing. Please upgrade the messaging account or use an approved test number.",
      );
    }
    if (result.body["code"] === 21211 || result.body["code"] === 60200) {
      throw new Error("That mobile number does not look valid. Please check and try again.");
    }
    throw new Error("We could not send the code by SMS. Please check the number and try again.");
  }
  return true;
}

/** Checks a code the recipient received by SMS. Returns true when it matches. */
export async function checkSmsCode(mobile10: string, code: string) {
  const result = await twilioForm(
    `/verify/v2/Services/${verifyServiceSid()}/VerificationCheck`,
    "POST",
    new URLSearchParams({ To: `+91${mobile10}`, Code: code }),
  );
  if (result.status === 404) {
    throw new Error("This code has expired. Please request a new one.");
  }
  if (!result.ok) {
    throw new Error("We could not check that code. Please request a new one.");
  }
  return result.body["status"] === "approved" && result.body["valid"] === true;
}
