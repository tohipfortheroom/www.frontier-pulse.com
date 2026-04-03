import Link from "next/link";

import { getHomePageData } from "@/lib/db/queries";

import { Hero } from "@/components/hero";
import { LaunchCard } from "@/components/launch-card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { NewsCard } from "@/components/news-card";
import { SectionHeader } from "@/components/section-header";
import { TimelineItem } from "@/components/timeline-item";
import { TopMoverCard } from "@/components/top-mover-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function HomePage() {
  const { todayStories, breakingStories, leaderboard, launches, timeline, topMovers, trendingTopics } =
    await getHomePageData();

  return (
    <div className="relative z-10">
      <Hero />

      <div className="mx-auto max-w-6xl px-5">
        <section className="fade-slide-up mt-20 rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] px-5 py-8 backdrop-blur-sm lg:mt-24 lg:px-8" style={{ animationDelay: "0.08s" }}>
          <SectionHeader
            label="TODAY IN AI"
            subtitle="The most important moves, launches, and shifts across the companies shaping the next era of technology."
            tone="amber"
          />
          <div className="scrollbar-none -mx-5 mt-8 overflow-x-auto px-5">
            <div className="flex min-w-max gap-4 snap-x snap-mandatory">
              {todayStories.map((story) => (
                <div key={story.slug} className="w-[280px] min-w-[280px] snap-start">
                  <NewsCard news={story} mode="compact" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="fade-slide-up mt-20 space-y-8 lg:mt-28" style={{ animationDelay: "0.14s" }}>
          <div className="section-rule" />
          <SectionHeader
            label="BREAKING MOVES"
            title="The stories reshaping the board right now."
            subtitle="The biggest headlines worth reading first, stripped down to what changed and why it matters."
            tone="amber"
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {breakingStories.map((story) => (
              <NewsCard key={story.slug} news={story} mode="breaking" />
            ))}
          </div>
        </section>

        <section className="fade-slide-up mt-20 space-y-8 lg:mt-28" style={{ animationDelay: "0.2s" }}>
          <div className="section-rule" />
          <SectionHeader
            label="AI RACE LEADERBOARD"
            title="Who is gaining momentum right now"
            subtitle="Who is gaining momentum right now — and why."
            tone="blue"
          />
          <LeaderboardTable
            rows={leaderboard}
            mode="preview"
            footerHref="/leaderboard"
            footerLabel="Full leaderboard →"
          />
        </section>

        <section className="fade-slide-up mt-20 space-y-8 lg:mt-28" style={{ animationDelay: "0.26s" }}>
          <div className="section-rule" />
          <SectionHeader
            label="TOP MOVERS"
            title="The companies making the sharpest moves"
            subtitle="A fast read on who surged, who slipped, and who still deserves your attention."
            tone="green"
          />
          <div className="grid gap-5 xl:grid-cols-3">
            {topMovers.map((mover) => (
              <TopMoverCard key={mover.label} mover={mover} />
            ))}
          </div>
        </section>

        <section className="fade-slide-up mt-20 space-y-8 lg:mt-28" style={{ animationDelay: "0.32s" }}>
          <div className="section-rule" />
          <SectionHeader
            label="LATEST LAUNCHES"
            title="New models, products, and platform updates worth tracking"
            subtitle="New models, products, tools, and platform updates worth watching."
            tone="purple"
          />
          <div className="scrollbar-none overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4 snap-x snap-mandatory">
              {launches.map((launch) => (
                <LaunchCard key={launch.slug} launch={launch} />
              ))}
            </div>
          </div>
        </section>

        <section className="fade-slide-up mt-20 space-y-8 lg:mt-28" style={{ animationDelay: "0.38s" }}>
          <div className="section-rule" />
          <SectionHeader
            label="THE TIMELINE"
            title="A live view of the moments shaping the AI race"
            subtitle="A live view of the moments shaping the AI race."
            tone="blue"
          />
          <div className="space-y-6">
            {timeline.slice(0, 8).map((entry, index) => (
              <TimelineItem key={entry.slug} entry={entry} align={index % 2 === 0 ? "left" : "right"} />
            ))}
          </div>
        </section>

        <section className="fade-slide-up mt-20 space-y-8 lg:mt-28" style={{ animationDelay: "0.44s" }}>
          <div className="section-rule" />
          <SectionHeader
            label="TRENDING TOPICS"
            title="The themes driving the conversation"
            subtitle="The themes driving the conversation right now."
            tone="purple"
          />
          <div className="flex flex-wrap gap-3">
            {trendingTopics.map((topic) => (
              <span
                key={topic.label}
                className={
                  topic.hot
                    ? "rounded-full border border-[rgba(167,139,250,0.24)] bg-[rgba(167,139,250,0.12)] px-5 py-3 text-base text-[var(--accent-purple)] transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_28px_rgba(167,139,250,0.18)]"
                    : "rounded-full border border-[var(--border)] bg-[rgba(18,18,26,0.88)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:scale-[1.04] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                }
              >
                {topic.label}
              </span>
            ))}
          </div>
        </section>

        <section className="fade-slide-up mt-20 lg:mt-28" style={{ animationDelay: "0.5s" }}>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.9)] p-8 backdrop-blur-sm lg:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--accent-blue),var(--accent-purple),transparent)]" />
            <div className="max-w-3xl space-y-5">
              <SectionHeader label="DAILY DIGEST" tone="blue" />
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
                A fast, readable summary of the ten stories that mattered most today.
              </h2>
              <p className="text-base leading-7 text-[var(--text-secondary)]">
                Biggest winner. Biggest loser. Most important launch. What to watch next.
              </p>
              <Link href="/daily-digest" className={buttonVariants({ variant: "secondary" })}>
                Read Today&apos;s Digest →
              </Link>
            </div>
          </div>
        </section>

        <section className="fade-slide-up mt-20 lg:mt-28" style={{ animationDelay: "0.56s" }}>
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              Stay on top of the AI race
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Get the biggest daily moves and launches in one clean summary.
            </p>
            <form className="flex flex-col gap-3 sm:flex-row">
              <Input type="email" placeholder="Email address" className="flex-1" />
              <button type="submit" className={buttonVariants({ variant: "primary", className: "sm:min-w-[150px]" })}>
                Subscribe
              </button>
            </form>
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              Free. No spam. Unsubscribe anytime.
            </p>
          </div>
        </section>

        <section className="fade-slide-up mt-20 pb-10 lg:mt-28" style={{ animationDelay: "0.62s" }}>
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
              WHY THIS EXISTS
            </p>
            <p className="text-lg leading-8 text-[var(--text-secondary)]">
              AI news is everywhere, but most people still have to piece the story together themselves. The AI Company
              Tracker brings the major companies, launches, and momentum shifts into one simple daily view.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/about" className={buttonVariants({ variant: "ghost", className: "text-[var(--accent-blue)]" })}>
                Learn more
              </Link>
              <Link href="/news" className={buttonVariants({ variant: "ghost" })}>
                Explore the full stream
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
