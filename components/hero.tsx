import Link from "next/link";

import type { HomeTickerItem } from "@/lib/seed/data";

import { AnimatedCounter } from "@/components/animated-counter";
import { BrandLogo } from "@/components/brand-logo";
import { formatLastUpdatedLabel, hasMeaningfulMetric } from "@/lib/utils";
import { HeroScrollCue } from "@/components/hero-scroll-cue";
import { InteractiveTicker } from "@/components/interactive-ticker";
import { buttonVariants } from "@/components/ui/button";

type HeroProps = {
  stats: {
    totalStories: number;
    totalCompanies: number;
    totalLaunches: number;
    lastUpdatedAt: string;
    seedMode: boolean;
  };
  tickerItems: HomeTickerItem[];
  firstSectionId: string;
};

export function Hero({ stats, tickerItems, firstSectionId }: HeroProps) {
  const counterItems = [
    { label: "Stories tracked", target: stats.totalStories },
    { label: "Companies monitored", target: stats.totalCompanies },
    { label: "Launches in play", target: stats.totalLaunches },
  ].filter((item) => hasMeaningfulMetric(item.target));
  const lastUpdatedLabel = formatLastUpdatedLabel(stats.lastUpdatedAt);
  const showStatsCard = counterItems.length > 0 || stats.seedMode || Boolean(lastUpdatedLabel);

  return (
    <section className="fade-slide-up pt-24 sm:pt-28 lg:pt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-4xl space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="surface-elevated panel-shadow inline-flex items-center rounded-full border border-[var(--border)] px-4 py-2.5">
              <BrandLogo variant="full" alt="" className="text-[14px] sm:text-[15px]" />
            </div>
            <div className="surface-elevated inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
              Mission Control For AI Momentum
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-[36px] font-bold leading-[0.96] tracking-[-0.04em] text-[var(--text-primary)] [text-shadow:0_0_48px_var(--accent-blue-soft)] sm:text-5xl lg:text-[56px]">
              The AI Race, Scored and Explained.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              Frontier Pulse tracks momentum across the companies shaping AI, turning launches, partnerships, funding,
              policy moves, and breakthroughs into a readable competitive brief.
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

          {showStatsCard ? (
            <div className="surface-card grid gap-3 rounded-2xl border border-[var(--border)] p-4 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:p-0">
              {counterItems.map((item, index) => (
                <div
                  key={item.label}
                  className={index < counterItems.length - 1 || stats.seedMode || lastUpdatedLabel ? "xl:border-r xl:border-[var(--border)] xl:px-5 xl:py-4" : "xl:px-5 xl:py-4"}
                >
                  <AnimatedCounter label={item.label} target={item.target} />
                </div>
              ))}
              {stats.seedMode ? (
                <div className="xl:px-5 xl:py-4">
                  <div className="min-w-[140px] space-y-2">
                    <div className="font-[family-name:var(--font-mono)] text-2xl font-semibold tracking-[-0.04em] text-[var(--text-tertiary)] sm:text-[28px]">
                      Demo
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Sample data
                    </p>
                  </div>
                </div>
              ) : lastUpdatedLabel ? (
                <div className="xl:px-5 xl:py-4">
                  <div className="min-w-[140px] space-y-2">
                    <div className="font-[family-name:var(--font-mono)] text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-xl">
                      {lastUpdatedLabel.replace("Last updated: ", "")}
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Last updated
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-10">
          <InteractiveTicker items={tickerItems} />
        </div>

        <div className="mt-8 flex justify-center">
          <HeroScrollCue targetId={firstSectionId} />
        </div>
      </div>
    </section>
  );
}
