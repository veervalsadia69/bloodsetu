import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOOD_TYPES, formatDate, GENDERS } from "@/lib/donor-shared";
import { registerDonor } from "@/lib/donors.functions";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register as a Blood Donor — BloodSetu India" },
      {
        name: "description",
        content:
          "Add your blood group, area and contact number to India's donor network in under two minutes. No login required and your number stays hidden until a recipient is verified.",
      },
      { property: "og:title", content: "Register as a Blood Donor — BloodSetu" },
      {
        property: "og:description",
        content: "Join the donor network in under two minutes. No account, no paperwork.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const submit = useServerFn(registerDonor);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{
    donorCode: string;
    available: boolean;
    nextEligibleDate: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    bloodType: "O+",
    lastDonationDate: "",
    medicalConditions: "",
    age: "",
    gender: "Male",
    city: "",
    neighborhood: "",
    contactNumber: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await submit({
        data: {
          ...form,
          bloodType: form.bloodType as (typeof BLOOD_TYPES)[number],
          gender: form.gender as (typeof GENDERS)[number],
          age: Number(form.age),
        },
      });
      setDone({
        donorCode: result.donorCode,
        available: result.available,
        nextEligibleDate: result.nextEligibleDate,
      });
      toast.success("Thank you! You're on the donor list.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.length < 160
          ? error.message
          : "Please check your details and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        {done ? (
          <div className="surface-card p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-semibold">You're registered</h1>
            <div className="mx-auto mt-4 inline-flex flex-col rounded-2xl bg-secondary px-5 py-3">
              <span className="text-xs text-muted-foreground">Your donor ID</span>
              <span className="font-mono text-lg font-semibold tracking-wide">
                {done.donorCode}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {done.available
                ? "You are shown as available to verified recipients looking for your blood group nearby."
                : `Because you donated recently, you'll be marked unavailable until ${formatDate(done.nextEligibleDate)}. We'll list you automatically after that.`}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/">Back to home</Link>
              </Button>
              <Button variant="outline" onClick={() => setDone(null)}>
                Register another donor
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold sm:text-4xl">Become a donor</h1>
            <p className="mt-3 text-muted-foreground">
              No login needed. Your phone number is never shown until a recipient completes identity
              verification.
            </p>

            <form onSubmit={handleSubmit} className="surface-card mt-8 grid gap-5 p-5 sm:p-7">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  required
                  className="h-12"
                  value={form.fullName}
                  onChange={(event) => set("fullName")(event.target.value)}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bloodType">Blood group</Label>
                  <Select value={form.bloodType} onValueChange={set("bloodType")}>
                    <SelectTrigger id="bloodType" className="h-12">
                      <SelectValue>{form.bloodType}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastDonationDate">Last donation date</Label>
                  <Input
                    id="lastDonationDate"
                    type="date"
                    className="h-12"
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.lastDonationDate}
                    onChange={(event) => set("lastDonationDate")(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank if you never donated.</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min={18}
                    max={65}
                    required
                    className="h-12"
                    value={form.age}
                    onChange={(event) => set("age")(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.gender} onValueChange={set("gender")}>
                    <SelectTrigger id="gender" className="h-12">
                      <SelectValue>{form.gender}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    required
                    className="h-12"
                    placeholder="Mumbai"
                    value={form.city}
                    onChange={(event) => set("city")(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="neighborhood">Neighbourhood</Label>
                  <Input
                    id="neighborhood"
                    required
                    className="h-12"
                    placeholder="Andheri West"
                    value={form.neighborhood}
                    onChange={(event) => set("neighborhood")(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactNumber">Mobile number</Label>
                <Input
                  id="contactNumber"
                  inputMode="numeric"
                  required
                  className="h-12"
                  placeholder="10-digit number"
                  value={form.contactNumber}
                  onChange={(event) => set("contactNumber")(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="medicalConditions">Medical conditions or health notes</Label>
                <Textarea
                  id="medicalConditions"
                  rows={3}
                  placeholder="BP, diabetes, medication, or anything a recipient should know. Write 'None' if healthy."
                  value={form.medicalConditions}
                  onChange={(event) => set("medicalConditions")(event.target.value)}
                />
              </div>

              <Button type="submit" size="lg" className="h-12" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving" : "Join the donor list"}
              </Button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
