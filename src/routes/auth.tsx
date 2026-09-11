import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hospital, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Hospital Login — BloodSetu Blood Stock Dashboard" },
      {
        name: "description",
        content:
          "Hospitals and blood banks sign in to BloodSetu to update unit stock for each blood group and record donor donation dates.",
      },
      { property: "og:title", content: "Hospital Login — BloodSetu" },
      {
        property: "og:description",
        content: "Update your blood stock and donor donation records on BloodSetu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HospitalAuthPage,
});

function HospitalAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/hospital", replace: true });
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/hospital" },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/hospital", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
        <div className="surface-card p-6">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Hospital className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Hospital login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            For hospitals and blood banks — update your unit stock for every blood group and record
            a donor's latest donation date.
          </p>

          {checkEmail ? (
            <p className="mt-6 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
              Almost done — check <span className="font-semibold">{email}</span> and click the
              confirmation link, then come back and sign in.
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Hospital email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-12"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-12"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signup" ? "Create hospital account" : "Sign in"}
              </Button>
            </form>
          )}

          {!checkEmail && (
            <button
              type="button"
              className="mt-4 w-full text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup"
                ? "Already registered? Sign in"
                : "New hospital? Create an account"}
            </button>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
