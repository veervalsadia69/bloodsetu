import { Link } from "@tanstack/react-router";
import { Droplet, Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  {
    to: "/search",
    search: { blood: "O+", city: "", area: "" },
    label: "Find donors",
  },
  {
    to: "/auth",
    label: "Hospital login",
  },
  {
    to: "/register",
    label: "Become a donor",
    primary: true,
  },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Droplet className="size-5" />
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-tight">
            BloodSetu
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {navLinks.map((link) =>
            link.primary ? (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
              >
                {link.label}
              </Link>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                search={("search" in link ? link.search : undefined) as Record<string, string> | undefined}
                className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[260px] p-5 sm:w-[320px]">
            <div className="mt-8 flex flex-col gap-2">
              {navLinks.map((link) =>
                link.primary ? (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    search={("search" in link ? link.search : undefined) as Record<string, string> | undefined}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>BloodSetu — connecting India's blood donors with the people who need them.</p>
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
