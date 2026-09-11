import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock3, HeartHandshake, MapPin, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/hero-donors.jpg";
import { CityInput } from "@/components/city-input";
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
import { BLOOD_TYPES } from "@/lib/donor-shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BloodSetu — Find Verified Blood Donors Near You in India" },
      {
        name: "description",
        content:
          "Search verified blood donors by blood group and neighbourhood across India. Donors register free in under 2 minutes; contact details unlock only after recipient verification.",
      },
      { property: "og:title", content: "BloodSetu — Find Verified Blood Donors Near You" },
      {
        property: "og:description",
        content:
          "A trusted blood donor network for India. Search by blood group and area, verify once, and reach available donors nearby.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [blood, setBlood] = useState<string>("O+");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");

  const goToVerify = () => {
    navigate({ to: "/verify", search: { blood, city, area } });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="hero-glow">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-soft">
                <ShieldCheck className="size-3.5 text-primary" /> Verified recipients only
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">
                Find a blood donor <span className="text-gradient-brand">near you</span>, in minutes.
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                BloodSetu connects patients and families with willing donors across India. Donor
                privacy is protected — phone numbers appear only after you verify yourself.
              </p>

              <div className="surface-card mt-8 p-4 sm:p-5">
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  action="/verify"
                  method="get"
                  onSubmit={(event) => {
                    event.preventDefault();
                    goToVerify();
                  }}
                >
                  <input type="hidden" name="blood" value={blood} />
                  <div className="space-y-1.5">
                    <Label htmlFor="blood">Blood group needed</Label>
                    <Select value={blood} onValueChange={setBlood}>
                      <SelectTrigger id="blood" className="h-12">
                        <SelectValue>{blood}</SelectValue>
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
                    <Label htmlFor="city">City</Label>
                    <CityInput id="city" value={city} onChange={setCity} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="area">Neighbourhood (optional)</Label>
                    <Input
                      id="area"
                      className="h-12"
                      placeholder="e.g. Andheri West"
                      value={area}
                      onChange={(event) => setArea(event.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 sm:col-span-2"
                    onClick={(event) => {
                      event.preventDefault();
                      goToVerify();
                    }}
                  >
                    <Search className="size-4" /> Find donors — verify to contact
                  </Button>
                </form>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Willing to donate?{" "}
                <a href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Add your details free
                </a>{" "}
                — no account needed.
              </p>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                width={1280}
                height={960}
                alt="A healthcare volunteer holding a patient's hand, with a red blood-drop pin"
                className="w-full rounded-3xl object-cover shadow-lift"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: HeartHandshake,
                title: "Donors register free",
                body: "No login, no paperwork. Add your blood group, area and phone number in under two minutes.",
              },
              {
                icon: ShieldCheck,
                title: "Verification before contact",
                body: "Recipients confirm identity with a live camera photo and a one-time code before any donor details appear.",
              },
              {
                icon: Clock3,
                title: "3-month rest enforced",
                body: "Anyone who donated in the last 90 days is automatically marked unavailable, so nobody is asked too soon.",
              },
            ].map((item) => (
              <div key={item.title} className="surface-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <item.icon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
          <div className="surface-card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                One donation can save three lives
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Add yourself to the network today. You stay in control — your number is shared only
                with verified recipients who need your blood group nearby.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 shrink-0">
              <a href="/register">
                <MapPin className="size-4" /> Become a donor
              </a>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
