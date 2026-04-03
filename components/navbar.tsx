"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { usePathname } from "next/navigation";

import { BookmarkCountBadge } from "@/components/bookmark-button";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
  { href: "/news", label: "News" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/daily-digest", label: "Daily Digest" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    setClock(format(new Date(), "HH:mm:ss"));

    const interval = window.setInterval(() => {
      setClock(format(new Date(), "HH:mm:ss"));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(22,22,31,0.92)] backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between gap-4 px-5">
        <div className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.15em] text-[var(--text-secondary)]">
          AI COMPANY TRACKER
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--text-tertiary)]">
          {clock ?? "--:--:--"}
        </div>
        <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-green)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-green)] animate-[pulse_2s_infinite]" />
          LIVE
        </div>
      </div>
      <nav className="scrollbar-none overflow-x-auto border-t border-[rgba(255,255,255,0.02)]">
        <div className="mx-auto flex min-w-max items-center justify-between gap-4 px-4 py-3 text-sm text-[var(--text-secondary)]">
          <div className="flex min-w-max items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]",
                  isActive(pathname, item.href) &&
                    "bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <BookmarkCountBadge />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
