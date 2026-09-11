import { Loader2, Lock, MapPin, PhoneCall, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, type DonorCard as Donor } from "@/lib/donor-shared";

export function DonorResultCard({
  donor,
  onCall,
  calling,
  onUnlock,
}: {
  donor: Donor;
  onCall?: (donorId: string) => void;
  calling?: boolean;
  onUnlock?: () => void;
}) {
  const revealed = Boolean(donor.fullName);

  return (
    <article className="surface-card flex flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-base font-semibold text-secondary-foreground">
            {donor.bloodType}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold">
              {donor.fullName ?? donor.maskedName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {donor.age} yrs · {donor.gender}
            </p>
          </div>
        </div>
        {donor.available ? (
          <Badge variant="success">Available</Badge>
        ) : (
          <Badge variant="muted">Unavailable</Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="truncate">
          {donor.neighborhood}, {donor.city}
        </span>
      </div>

      {!donor.available && donor.nextEligibleDate && (
        <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          Resting after a recent donation. Eligible again on {formatDate(donor.nextEligibleDate)}.
        </p>
      )}

      {revealed ? (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Health notes</p>
            <p className="font-medium">{donor.medicalConditions || "None reported"}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Last donation</p>
            <p className="font-medium">{formatDate(donor.lastDonationDate)}</p>
          </div>
          <Button className="w-full" disabled={calling} onClick={() => onCall?.(donor.id)}>
            {calling ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />}
            {calling ? "Opening dial pad…" : "Call donor — number stays private"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Your dial pad opens with a private bridge number that connects you to the donor.
            Neither side ever sees the other's number.
          </p>
        </div>
      ) : (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {donor.available ? (
              <>
                <Lock className="size-4 shrink-0" />
                <span>Name and calling unlock after login</span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4 shrink-0" />
                <span>Contact hidden while resting</span>
              </>
            )}
          </div>
          {donor.available && onUnlock && (
            <Button className="w-full" onClick={onUnlock}>
              <ShieldCheck className="size-4" /> Log in to contact this donor
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
