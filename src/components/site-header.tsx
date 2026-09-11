import { Link } from "@tanstack/react-router";
import { Droplet } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Droplet className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">RaktSetu</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            to="/search"
            search={{ blood: "O+", city: "", area: "" }}
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Find donors
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            Become a donor
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>RaktSetu — connecting India's blood donors with the people who need them.</p>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="transition-colors hover:text-foreground">
            Records
          </Link>
          <span>Donor privacy protected by verification</span>
        </div>
      </div>
    </footer>
  );
}
