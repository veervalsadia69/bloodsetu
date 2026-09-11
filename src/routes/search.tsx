import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { DonorResultCard } from "@/components/donor-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
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
import { ACCESS_TOKEN_KEY, BLOOD_TYPES } from "@/lib/donor-shared";
import { searchDonors } from "@/lib/donors.functions";

type SearchParams = { blood: string; city: string; area: string };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    blood: BLOOD_TYPES.includes(String(search.blood ?? "") as (typeof BLOOD_TYPES)[number])
      ? String(search.blood)
      : "O+",
    city: String(search.city ?? ""),
    area: String(search.area ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Search Blood Donors by Group and Area — RaktSetu" },
      {
        name: "description",
        content:
          "See how many donors match your blood group and neighbourhood. Verify your identity once to unlock donor names and phone numbers.",
      },
      { property: "og:title", content: "Search Blood Donors by Group and Area — RaktSetu" },
      {
        property: "og:description",
        content: "Matching donors sorted by nearest neighbourhood first, with contact after verification.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const run = useServerFn(searchDonors);
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState(params);

  useEffect(() => setDraft(params), [params]);
  useEffect(() => {
    setToken(localStorage.getItem(ACCESS_TOKEN_KEY) ?? "");
  }, []);

  const query = useQuery({
    queryKey: ["donors", params, token],
    queryFn: () =>
      run({
        data: {
          bloodType: params.blood as (typeof BLOOD_TYPES)[number],
          city: params.city,
          neighborhood: params.area,
          token,
        },
      }),
  });

  const donors = query.data?.donors ?? [];
  const availableCount = donors.filter((donor) => donor.available).length;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <form
          className="surface-card grid gap-4 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/search", search: draft });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="blood">Blood group</Label>
            <Select
              value={draft.blood}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, blood: value }))}
            >
              <SelectTrigger id="blood" className="h-12">
                <SelectValue />
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
            <Input
              id="city"
              className="h-12"
              placeholder="Any city"
              value={draft.city}
              onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area">Neighbourhood</Label>
            <Input
              id="area"
              className="h-12"
              placeholder="Optional"
              value={draft.area}
              onChange={(event) => setDraft((prev) => ({ ...prev, area: event.target.value }))}
            />
          </div>
          <Button type="submit" size="lg" className="h-12">
            <SearchIcon className="size-4" /> Search
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {params.blood} donors{params.city ? ` in ${params.city}` : " across India"}
          </h1>
          {query.data && (
            <Badge variant="muted">
              {availableCount} available · {donors.length} matched
            </Badge>
          )}
          {query.data?.verified && <Badge variant="success">Verified access</Badge>}
        </div>

        {!query.data?.verified && (
          <div className="surface-card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-display text-base font-semibold">
                  Donor names and numbers are hidden
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verify your identity once with Aadhaar and a one-time code to unlock contact
                  details for every matching donor.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="h-12 shrink-0">
              <Link to="/verify" search={draft}>
                Verify to see contacts
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-6">
          {query.isPending ? (
            <div className="flex items-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Finding donors…
            </div>
          ) : query.isError ? (
            <p className="py-16 text-muted-foreground">
              We couldn't load donors right now. Please try the search again.
            </p>
          ) : donors.length === 0 ? (
            <div className="surface-card p-8 text-center">
              <h2 className="font-display text-lg font-semibold">No donors matched yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try removing the city or neighbourhood filter, or check a compatible blood group.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {donors.map((donor) => (
                <DonorResultCard key={donor.id} donor={donor} />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
