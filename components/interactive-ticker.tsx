"use client";

import Link from "next/link";

import type { HomeTickerItem } from "@/lib/seed/data";

import { NewsTickerItem } from "@/components/news-ticker-item";

export function InteractiveTicker({ items }: { items: HomeTickerItem[] }) {
  return (
    <div className="interactive-ticker ticker-mask surface-elevated rounded-2xl border border-[var(--border)] px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:border-[var(--border-hover)] hover:shadow-[0_16px_32px_var(--accent-blue-soft)]">
      <div className="ticker-track">
        {[...items, ...items].map((item, index) => (
          <Link
            key={`${item.slug}-${index}`}
            href={`/news#${item.slug}`}
            className="group/item cursor-pointer rounded-full px-1 transition-all duration-200 hover:bg-[var(--surface-soft)] hover:[filter:brightness(1.08)]"
          >
            <NewsTickerItem
              company={item.company}
              direction={item.direction}
              text={item.text}
              tone={item.tone}
              className="group-hover/item:text-[var(--text-primary)]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
