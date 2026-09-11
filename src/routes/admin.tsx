import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/donor-shared";
import { deleteDonorAdmin, listDonorsAdmin, setDonorActive } from "@/lib/donors.functions";

type Row = Awaited<ReturnType<typeof listDonorsAdmin>>[number];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Donor Records — BloodSetu Admin" },
      {
        name: "description",
        content:
          "Private records view for BloodSetu coordinators: review donor entries, availability status and remove outdated records.",
      },
      { property: "og:title", content: "Donor Records — BloodSetu Admin" },
      { property: "og:description", content: "Coordinator-only donor records view." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const load = useServerFn(listDonorsAdmin);
  const toggle = useServerFn(setDonorActive);
  const remove = useServerFn(deleteDonorAdmin);

  const [code, setCode] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  function showError(error: unknown) {
    toast.error(
      error instanceof Error && error.message.length < 160
        ? error.message
        : "Something went wrong. Please try again.",
    );
  }

  async function fetchRows(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    try {
      setRows(await load({ data: { code } }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">Donor records</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A private view for coordinators. Enter the access code to review and manage donor entries.
        </p>

        <form onSubmit={fetchRows} className="surface-card mt-6 flex flex-wrap items-end gap-4 p-5">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="code">Access code</Label>
            <Input
              id="code"
              type="password"
              required
              className="h-12"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-12" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {rows ? "Refresh" : "Open records"}
          </Button>
        </form>

        {rows && (
          <div className="surface-card mt-6 overflow-x-auto p-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor ID</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last donation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Listed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.donorCode}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.age} yrs · {row.gender} · {row.medicalConditions || "No notes"}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{row.bloodType}</TableCell>
                    <TableCell>
                      {row.neighborhood}, {row.city}
                    </TableCell>
                    <TableCell>+91 {row.contactNumber}</TableCell>
                    <TableCell>{formatDate(row.lastDonationDate)}</TableCell>
                    <TableCell>
                      {row.available ? (
                        <Badge variant="success">Eligible</Badge>
                      ) : (
                        <Badge variant="muted">Until {formatDate(row.nextEligibleDate)}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.isActive}
                        onCheckedChange={async (checked) => {
                          try {
                            await toggle({ data: { code, id: row.id, isActive: checked } });
                            setRows(
                              (prev) =>
                                prev?.map((entry) =>
                                  entry.id === row.id ? { ...entry, isActive: checked } : entry,
                                ) ?? null,
                            );
                          } catch (error) {
                            showError(error);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${row.fullName}`}
                        onClick={async () => {
                          try {
                            await remove({ data: { code, id: row.id } });
                            setRows(
                              (prev) => prev?.filter((entry) => entry.id !== row.id) ?? null,
                            );
                            toast.success("Record deleted");
                          } catch (error) {
                            showError(error);
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
