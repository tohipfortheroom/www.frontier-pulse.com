"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { usePathname } from "next/navigation";

import { BookmarkCountBadge } from "@/components/bookmark-button";
import { BrandLogo } from "@/components/brand-logo";
import { DataFreshnessIndicator } from "@/components/data-freshness-indicator";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
  { href: "/news", label: "News" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/compare", label: "Compare" },
  { href: "/trending", label: "Trending" },
  { href: "/timeline", label: "Timeline" },
  { href: "/daily-digest", label: "Daily Digest" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [clock, setClock] = useState<Date | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setClock(new Date());

    const interval = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab" || !focusable || focusable.length === 0) {
        return;
      }

      const items = Array.from(focusable);
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const clockParts = clock
    ? {
        hours: format(clock, "HH"),
        minutes: format(clock, "mm"),
        seconds: format(clock, "ss"),
      }
    : {
        hours: "00",
        minutes: "00",
        seconds: "00",
      };

  return (
    <>
      <header className="surface-card-strong sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-xl">
        <div className="relative flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="surface-soft inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <Link href="/" aria-label={BRAND_NAME} className="flex min-w-0 items-center">
            <BrandLogo variant="full" className="text-[12px] sm:text-[15px]" />
          </Link>

          <div
            className={cn(
              "pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center font-[family-name:var(--font-mono)] text-[12px] text-[var(--text-tertiary)] md:flex",
              !clock && "invisible",
            )}
            aria-hidden={!clock}
          >
            <span>{clockParts.hours}</span>
            <span className="px-0.5 animate-[clockBlink_1s_steps(1,end)_infinite]">:</span>
            <span>{clockParts.minutes}</span>
            <span className="px-0.5 animate-[clockBlink_1s_steps(1,end)_infinite]">:</span>
            <span>{clockParts.seconds}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <DataFreshnessIndicator />
            <ThemeToggle />
          </div>
        </div>
        <nav className="hidden border-t border-[var(--border)] md:block">
          <div className="mx-auto flex items-center justify-between gap-4 px-4 py-3 text-sm text-[var(--text-secondary)]">
            <div className="flex min-w-max items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-4 py-2 transition-all duration-300 hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] after:absolute after:bottom-1 after:left-4 after:right-4 after:h-px after:origin-left after:scale-x-0 after:bg-[var(--accent-blue)] after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100",
                    isActive(pathname, item.href) &&
                      "bg-[var(--surface-soft)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border)] after:scale-x-100",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <BookmarkCountBadge />
              <NotificationBell />
            </div>
          </div>
        </nav>
      </header>

      <div className={cn("fixed inset-0 z-[60] md:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-[var(--surface-overlay)] backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close navigation menu"
        />

        <aside
          id="mobile-navigation"
          ref={drawerRef}
          className={cn(
            "surface-card-strong panel-shadow-strong absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col border-r border-[var(--border)] px-5 pb-6 pt-5 transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-modal="true"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label={BRAND_NAME} className="min-w-0">
              <BrandLogo variant="wordmark" className="text-[18px]" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="surface-soft inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-base transition-all duration-200",
                  isActive(pathname, item.href)
                    ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto space-y-3 border-t border-[var(--border)] pt-5">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <GlobalSearch />
              <BookmarkCountBadge />
              <NotificationBell />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
