import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_TOKEN_KEY, BLOOD_TYPES } from "@/lib/donor-shared";
import { confirmVerification, startVerification } from "@/lib/donors.functions";

type SearchParams = { blood: string; city: string; area: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    blood: BLOOD_TYPES.includes(String(search["blood"] ?? "") as (typeof BLOOD_TYPES)[number])
      ? String(search["blood"])
      : "O+",
    city: String(search["city"] ?? ""),
    area: String(search["area"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Recipient Verification — Unlock Donor Contacts | RaktSetu" },
      {
        name: "description",
        content:
          "Confirm your identity with your name, Aadhaar number, mobile number and a one-time code to unlock verified blood donor contact details.",
      },
      { property: "og:title", content: "Recipient Verification — RaktSetu" },
      {
        property: "og:description",
        content: "A one-time identity check that protects donor privacy before contact is shared.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const start = useServerFn(startVerification);
  const confirm = useServerFn(confirmVerification);

  const [step, setStep] = useState<"details" | "otp">("details");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState({ fullName: "", mobile: "", aadhaar: "" });
  const [session, setSession] = useState<{ id: string; demoCode: string; mobile: string } | null>(
    null,
  );
  const [code, setCode] = useState("");

  function showError(error: unknown) {
    toast.error(
      error instanceof Error && error.message.length < 160
        ? error.message
        : "Please check your details and try again.",
    );
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    try {
      const result = await start({ data: details });
      setSession({ id: result.verificationId, demoCode: result.demoCode, mobile: result.mobile });
      setStep("otp");
      toast.success("One-time code generated");
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    try {
      const result = await confirm({ data: { verificationId: session.id, code } });
      localStorage.setItem(ACCESS_TOKEN_KEY, result.token);
      toast.success("Verified. Donor contacts unlocked.");
      navigate({ to: "/search", search: params });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-soft">
          <ShieldCheck className="size-3.5 text-primary" /> Step {step === "details" ? "1" : "2"} of 2
        </span>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Recipient verification</h1>
        <p className="mt-3 text-muted-foreground">
          Donors trust RaktSetu because their details are never public. Confirm who you are once, and
          contact details stay unlocked for 7 days.
        </p>

        {step === "details" ? (
          <form onSubmit={sendCode} className="surface-card mt-8 grid gap-5 p-5 sm:p-7">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Your full name</Label>
              <Input
                id="fullName"
                required
                className="h-12"
                value={details.fullName}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, fullName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aadhaar">Aadhaar number</Label>
              <Input
                id="aadhaar"
                required
                inputMode="numeric"
                className="h-12"
                placeholder="12 digits"
                value={details.aadhaar}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, aadhaar: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                We store only the last 4 digits plus a scrambled fingerprint — never the full number.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                required
                inputMode="numeric"
                className="h-12"
                placeholder="10-digit number"
                value={details.mobile}
                onChange={(event) => setDetails((prev) => ({ ...prev, mobile: event.target.value }))}
              />
            </div>
            <Button type="submit" size="lg" className="h-12" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Sending code" : "Send one-time code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="surface-card mt-8 grid gap-5 p-5 sm:p-7">
            <div className="flex items-center gap-3 rounded-2xl bg-accent/20 p-4 text-sm">
              <KeyRound className="size-5 shrink-0 text-accent-foreground" />
              <p className="text-accent-foreground">
                Demo mode: SMS delivery isn't connected yet, so your code is{" "}
                <strong className="font-display tracking-widest">{session?.demoCode}</strong>. It
                would normally be texted to {session?.mobile}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Enter the 6-digit code</Label>
              <Input
                id="code"
                required
                inputMode="numeric"
                maxLength={6}
                className="h-14 text-center font-display text-xl tracking-[0.5em]"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button type="submit" size="lg" className="h-12" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Verifying" : "Verify and see donors"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("details");
                setCode("");
              }}
            >
              Change my details
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
