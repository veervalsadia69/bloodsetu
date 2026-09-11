import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
      { title: "Recipient Verification — Unlock Donor Contacts | BloodSetu" },
      {
        name: "description",
        content:
          "Confirm your identity with your name, mobile number, a live camera photo and a one-time code to unlock verified blood donor contact details.",
      },
      { property: "og:title", content: "Recipient Verification — BloodSetu" },
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
  const [details, setDetails] = useState({ fullName: "", mobile: "" });
  const [session, setSession] = useState<{ id: string; demoCode: string; mobile: string } | null>(
    null,
  );
  const [code, setCode] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function openCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setPhoto(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError(
        "We could not open your camera. Allow camera access in your browser, then try again. A live photo is required — uploads are not accepted.",
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      480,
      480,
    );
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
  }

  function showError(error: unknown) {
    toast.error(
      error instanceof Error && error.message.length < 200
        ? error.message
        : "Please check your details and try again.",
    );
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (!photo) {
      toast.error("Please take a live photo with your camera to continue.");
      return;
    }
    setBusy(true);
    try {
      const result = await start({ data: { ...details, faceImage: photo } });
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
          Donors trust BloodSetu because their details are never public. Confirm who you are once,
          and contact details stay unlocked for 7 days.
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

            <div className="space-y-2">
              <Label>Live photo (required)</Label>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                <div className="relative aspect-square w-full">
                  {photo ? (
                    <img src={photo} alt="Your captured photo" className="size-full object-cover" />
                  ) : (
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`size-full object-cover ${cameraOn ? "" : "hidden"}`}
                    />
                  )}
                  {!photo && !cameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <Camera className="size-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Take a live photo of your face with your device camera.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!cameraOn && !photo && (
                  <Button type="button" variant="secondary" onClick={openCamera}>
                    <Camera className="size-4" /> Open camera
                  </Button>
                )}
                {cameraOn && (
                  <Button type="button" onClick={capture}>
                    <Camera className="size-4" /> Take photo
                  </Button>
                )}
                {photo && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPhoto(null);
                      void openCamera();
                    }}
                  >
                    <RefreshCw className="size-4" /> Retake photo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Only a live camera photo is accepted — gallery uploads are not allowed. Your photo is
                stored privately and used only to keep donors safe.
              </p>
              {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
            </div>

            <Button type="submit" size="lg" className="h-12" disabled={busy || !photo}>
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
