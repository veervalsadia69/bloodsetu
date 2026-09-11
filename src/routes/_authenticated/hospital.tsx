import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Droplet, Loader2, LogOut, Save, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CityInput } from "@/components/city-input";
import { HospitalNameInput } from "@/components/hospital-name-input";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/donor-shared";
import {
  getHospital,
  hospitalFindDonors,
  hospitalUpdateDonation,
  saveHospitalProfile,
  setBloodStock,
} from "@/lib/hospital.functions";

export const Route = createFileRoute("/_authenticated/hospital")({
  head: () => ({
    meta: [
      { title: "Hospital Dashboard — Blood Stock and Donor Records | BloodSetu" },
      {
        name: "description",
        content:
          "Update available units for every blood group and record the latest donation date for donors your hospital served.",
      },
      { property: "og:title", content: "Hospital Dashboard — BloodSetu" },
      {
        property: "og:description",
        content: "Manage your blood stock and donor donation records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HospitalDashboard,
});

function HospitalDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const load = useServerFn(getHospital);
  const saveProfile = useServerFn(saveHospitalProfile);
  const saveStock = useServerFn(setBloodStock);
  const findDonors = useServerFn(hospitalFindDonors);
  const updateDonation = useServerFn(hospitalUpdateDonation);

  const [profile, setProfile] = useState({ name: "", city: "", contactNumber: "" });
  const [units, setUnits] = useState<Record<string, string>>({});
  const [donorQuery, setDonorQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [dates, setDates] = useState<Record<string, string>>({});

  const hospitalQuery = useQuery({ queryKey: ["hospital"], queryFn: () => load({}) });

  useEffect(() => {
    if (!hospitalQuery.data) return;
    setProfile(hospitalQuery.data.hospital);
    setUnits(
      Object.fromEntries(hospitalQuery.data.stock.map((row) => [row.bloodType, String(row.units)])),
    );
  }, [hospitalQuery.data]);

  const donorsQuery = useQuery({
    queryKey: ["hospital-donors", submittedQuery],
    queryFn: () => findDonors({ data: { query: submittedQuery } }),
  });

  const profileMutation = useMutation({
    mutationFn: () => saveProfile({ data: profile }),
    onSuccess: () => toast.success("Hospital details saved."),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  const stockMutation = useMutation({
    mutationFn: (input: { bloodType: string; units: number }) =>
      saveStock({ data: input as never }),
    onSuccess: (_data, input) => {
      toast.success(`${input.bloodType} stock updated.`);
      queryClient.invalidateQueries({ queryKey: ["hospital"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  const donationMutation = useMutation({
    mutationFn: (input: { donorId: string; lastDonationDate: string }) =>
      updateDonation({ data: input }),
    onSuccess: () => {
      toast.success("Donation date updated — the 3-month rest period now applies.");
      queryClient.invalidateQueries({ queryKey: ["hospital-donors"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update."),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Hospital dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your blood stock current and log donations as they happen.
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>

        <section className="surface-card mt-6 p-5">
          <h2 className="font-display text-lg font-semibold">Hospital details</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              profileMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="hname">Hospital name</Label>
              <HospitalNameInput
                id="hname"
                required
                value={profile.name}
                onChange={(value) => setProfile((p) => ({ ...p, name: value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hcity">City</Label>
              <CityInput
                id="hcity"
                value={profile.city}
                onChange={(value) => setProfile((p) => ({ ...p, city: value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hphone">Contact number</Label>
              <Input
                id="hphone"
                className="h-12"
                inputMode="numeric"
                placeholder="10-digit number"
                value={profile.contactNumber}
                onChange={(event) =>
                  setProfile((p) => ({ ...p, contactNumber: event.target.value }))
                }
              />
            </div>
            <Button type="submit" className="h-12 sm:col-span-3" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save hospital details
            </Button>
          </form>
        </section>

        <section className="surface-card mt-6 p-5">
          <h2 className="font-display text-lg font-semibold">Blood stock (units)</h2>
          {hospitalQuery.isPending ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your stock…
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(hospitalQuery.data?.stock ?? []).map((row) => (
                <div key={row.bloodType} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-display text-base font-semibold">
                      <Droplet className="size-4 text-primary" /> {row.bloodType}
                    </span>
                    <Badge variant={row.units > 0 ? "success" : "muted"}>{row.units} in stock</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      className="h-11"
                      inputMode="numeric"
                      aria-label={`Units of ${row.bloodType}`}
                      value={units[row.bloodType] ?? ""}
                      onChange={(event) =>
                        setUnits((prev) => ({ ...prev, [row.bloodType]: event.target.value }))
                      }
                    />
                    <Button
                      className="h-11"
                      disabled={stockMutation.isPending}
                      onClick={() =>
                        stockMutation.mutate({
                          bloodType: row.bloodType,
                          units: Number(units[row.bloodType] ?? 0),
                        })
                      }
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card mt-6 p-5">
          <h2 className="font-display text-lg font-semibold">Record a donation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search a donor and set the date they last donated. They are automatically marked
            unavailable for 3 months.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedQuery(donorQuery.trim());
            }}
          >
            <Input
              className="h-12"
              placeholder="Donor name, phone or city"
              value={donorQuery}
              onChange={(event) => setDonorQuery(event.target.value)}
            />
            <Button type="submit" className="h-12">
              <Search className="size-4" /> Search
            </Button>
          </form>

          <div className="mt-4 space-y-3">
            {donorsQuery.isPending ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading donors…
              </div>
            ) : (donorsQuery.data ?? []).length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No donors matched that search.</p>
            ) : (
              (donorsQuery.data ?? []).map((donor) => (
                <div
                  key={donor.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-end sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-display font-semibold">
                      {donor.fullName}{" "}
                      <Badge variant="muted" className="ml-1">
                        {donor.bloodType}
                      </Badge>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {donor.neighborhood}, {donor.city} · {donor.contactNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last donation: {formatDate(donor.lastDonationDate)}
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`date-${donor.id}`}>Donation date</Label>
                      <Input
                        id={`date-${donor.id}`}
                        type="date"
                        className="h-11"
                        max={new Date().toISOString().slice(0, 10)}
                        value={dates[donor.id] ?? donor.lastDonationDate ?? ""}
                        onChange={(event) =>
                          setDates((prev) => ({ ...prev, [donor.id]: event.target.value }))
                        }
                      />
                    </div>
                    <Button
                      className="h-11"
                      disabled={donationMutation.isPending}
                      onClick={() => {
                        const value = dates[donor.id] ?? donor.lastDonationDate ?? "";
                        if (!value) {
                          toast.error("Pick the donation date first.");
                          return;
                        }
                        donationMutation.mutate({ donorId: donor.id, lastDonationDate: value });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
