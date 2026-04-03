import Link from "next/link";

import { homeTickerItems } from "@/lib/seed/data";

import { NewsTickerItem } from "@/components/news-ticker-item";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="fade-slide-up pt-24 sm:pt-28 lg:pt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(18,18,26,0.72)] px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
            Mission Control For AI Momentum
          </div>
          <div className="space-y-6">
            <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-[36px] font-bold leading-none tracking-[-0.04em] text-[var(--text-primary)] [text-shadow:0_0_80px_rgba(77,159,255,0.15)] sm:text-5xl lg:text-[56px]">
              Track the AI race in real time.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              The AI world moves fast. The AI Company Tracker turns the daily flood of announcements, product launches,
              funding news, research claims, and policy shifts into a clean scoreboard you can actually follow.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/leaderboard" className={buttonVariants({ variant: "primary" })}>
              View Leaderboard
            </Link>
            <Link href="/news" className={buttonVariants({ variant: "secondary" })}>
              Browse Latest News
            </Link>
          </div>
        </div>

        <div className="ticker-mask mt-10 rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.72)] px-4 py-4 backdrop-blur-sm">
          <div className="ticker-track">
            {[...homeTickerItems, ...homeTickerItems].map((item, index) => (
              <NewsTickerItem
                key={`${item.company}-${index}`}
                company={item.company}
                direction={item.direction}
                text={item.text}
                tone={item.tone}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
