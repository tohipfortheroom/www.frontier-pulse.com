import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";
import { ArrowRight, Flame } from "lucide-react";

import { getHomePageData } from "@/lib/db/queries";

import { Hero } from "@/components/hero";
import { HorizontalScroller } from "@/components/horizontal-scroller";
import { InteractiveTimeline } from "@/components/interactive-timeline";
import { LaunchCard } from "@/components/launch-card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { NewsletterForm } from "@/components/newsletter-form";
import { NewsCard } from "@/components/news-card";
import { ScrollProgress } from "@/components/scroll-progress";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeader } from "@/components/section-header";
import { SectionNav } from "@/components/section-nav";
import { TopMoverCard } from "@/components/top-mover-card";
import { TrendSignals } from "@/components/trend-signals";
import { buttonVariants } from "@/components/ui/button";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";
import { formatDateLabel, formatUpdateTimestamp } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { stats } = await getHomePageData();
  const title = `${BRAND_NAME} — AI Momentum Tracker`;
  const description = `${BRAND_NAME} scores and explains AI momentum across ${stats.totalCompanies} companies and ${stats.totalStories} recent stories shaping the race.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteUrl,
      type: "website",
      siteName: BRAND_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { todayStories, breakingStories, leaderboard, launches, timeline, topMovers, trendingTopics, tickerItems, stats, sectionFreshness, leaderboardRefreshState } =
    await getHomePageData();
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    potentialAction: {
      "@type": "SearchAction",
      target: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/news?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const sections = [
    { id: "today-in-ai", label: "Today in AI" },
    { id: "breaking-moves", label: "Breaking Moves" },
    { id: "leaderboard-preview", label: "Leaderboard" },
    { id: "trend-signals", label: "Trend Signals" },
    { id: "top-movers", label: "Top Movers" },
    { id: "latest-launches", label: "Latest Launches" },
    { id: "timeline", label: "Timeline" },
    { id: "trending-topics", label: "Trending Topics" },
    { id: "daily-digest-cta", label: "Daily Digest" },
    { id: "newsletter", label: "Newsletter" },
    { id: "why-frontier-pulse", label: "Why This Exists" },
  ] as const;

  return (
    <div className="relative z-10">
      <Script
        id="home-website-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <ScrollProgress />
      <SectionNav sections={[...sections]} />
      <Hero stats={stats} tickerItems={tickerItems} firstSectionId={sections[0].id} />

      <div className="mx-auto max-w-6xl px-5">
        <ScrollReveal delay={40}>
          <section
            id="today-in-ai"
            className="surface-card scroll-mt-32 mt-20 rounded-3xl border border-[var(--border)] px-5 py-8 backdrop-blur-sm lg:mt-24 lg:px-8"
          >
            <SectionHeader
              label="TODAY IN AI"
              subtitle="The most important moves, launches, and shifts across the companies shaping the next era of technology."
              tone="amber"
            />
            <ModuleStatusStrip
              className="mt-4"
              items={[
                { label: "Updated", value: sectionFreshness.todayInAi.newestContentAt ? formatUpdateTimestamp(sectionFreshness.todayInAi.newestContentAt) : "Unavailable" },
                { label: "Stories", value: todayStories.length.toString() },
                { label: "Window", value: "Current day" },
              ]}
              warning={
                sectionFreshness.todayInAi.stale && sectionFreshness.todayInAi.newestContentAt
                  ? `Today in AI is behind the live feed. The latest visible story is from ${formatDateLabel(sectionFreshness.todayInAi.newestContentAt)}.`
                  : null
              }
            />
            {todayStories.length > 0 && !sectionFreshness.todayInAi.stale ? (
              <HorizontalScroller viewportClassName="-mx-5 mt-8 px-5">
                <>
                  {todayStories.map((story) => (
                    <div key={story.slug} className="w-[280px] min-w-[280px] snap-start">
                      <NewsCard news={story} mode="compact" />
                    </div>
                  ))}
                </>
              </HorizontalScroller>
            ) : (
              <div className="mt-8 space-y-3 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">
                  {sectionFreshness.todayInAi.stale && sectionFreshness.todayInAi.newestContentAt
                    ? `Today in AI is behind. The latest visible snapshot is from ${formatDateLabel(sectionFreshness.todayInAi.newestContentAt)}.`
                    : "No stories tracked yet today. Check back soon."}
                </p>
                <Link href="/news" className={buttonVariants({ variant: "ghost" })}>
                  Open the full news stream
                </Link>
              </div>
            )}
          </section>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <section id="breaking-moves" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="BREAKING MOVES"
              title="The stories reshaping the board right now."
              subtitle="The biggest headlines worth reading first, stripped down to what changed and why it matters."
              tone="amber"
            />
            <ModuleStatusStrip
              items={[
                { label: "Updated", value: sectionFreshness.breakingMoves.newestContentAt ? formatUpdateTimestamp(sectionFreshness.breakingMoves.newestContentAt) : "Unavailable" },
                { label: "Stories", value: breakingStories.length.toString() },
                { label: "Window", value: "Critical only" },
              ]}
            />
            {breakingStories.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {breakingStories.map((story) => (
                  <NewsCard key={story.slug} news={story} mode="breaking" />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-[var(--text-tertiary)]">
                No breaking moves right now.
              </p>
            )}
          </section>
        </ScrollReveal>

        <ScrollReveal delay={110}>
          <section id="leaderboard-preview" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="AI RACE LEADERBOARD"
              title="Who&apos;s gaining ground"
              subtitle="The companies whose momentum scores are climbing — and what&apos;s driving it."
              tone="blue"
            />
            <ModuleStatusStrip
              items={[
                { label: "Snapshot", value: leaderboardRefreshState.lastUpdatedAt ? formatUpdateTimestamp(leaderboardRefreshState.lastUpdatedAt) : "Unavailable" },
                { label: "Surface", value: `Top ${Math.min(10, leaderboard.length)} of ${stats.totalCompanies}` },
                { label: "Window", value: "Decay-weighted score" },
              ]}
              warning={
                leaderboardRefreshState.status === "running"
                  ? leaderboardRefreshState.reason
                  : sectionFreshness.leaderboard.stale
                    ? leaderboardRefreshState.reason
                    : null
              }
            />
            <LeaderboardTable
              rows={leaderboard}
              mode="preview"
              footerHref="/leaderboard"
              footerLabel="Full leaderboard →"
            />

            <div className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm lg:p-8">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
                HOW SCORING WORKS
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                What moves a company up or down the board
              </h3>
              <ul className="mt-6 grid gap-3 text-sm leading-7 text-[var(--text-secondary)] lg:grid-cols-2">
                <li>Scores reflect weighted real-world events such as launches, partnerships, funding, breakthroughs, and policy moves.</li>
                <li>Recent developments count more than older ones, so new execution can outrank legacy reputation.</li>
                <li>Each signal decays over time, which keeps the ranking focused on current momentum instead of stale headlines.</li>
                <li>Negative events, including lawsuits, outages, and safety incidents, pull scores down.</li>
                <li>Official announcements and major publications carry more weight than low-credibility chatter.</li>
                <li>Scores refresh throughout the day, with priority checks every 15 minutes and broader updates every 30 minutes.</li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={130}>
          <section id="trend-signals" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="TREND SIGNALS"
              title="Momentum patterns worth watching"
              subtitle="Algorithmic detection of acceleration, slowdowns, reversals, and leaderboard gaps."
              tone="green"
            />
            <TrendSignals />
          </section>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <section id="top-movers" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="TOP MOVERS"
              title="The companies making the sharpest moves"
              subtitle="A fast read on who surged, who slipped, and who still deserves your attention."
              tone="green"
            />
            {topMovers.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-3">
                {topMovers.map((mover) => (
                  <TopMoverCard key={mover.label} mover={mover} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-[var(--text-tertiary)]">
                No major movers today.
              </p>
            )}
          </section>
        </ScrollReveal>

        <ScrollReveal delay={180}>
          <section id="latest-launches" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="LATEST LAUNCHES"
              title="New models, products, and platform updates worth tracking"
              subtitle="The latest releases that could shift the competitive landscape."
              tone="purple"
            />
            {launches.length > 0 ? (
              <HorizontalScroller viewportClassName="pb-2">
                <>
                  {launches.map((launch) => (
                    <LaunchCard key={launch.slug} launch={launch} />
                  ))}
                </>
              </HorizontalScroller>
            ) : (
              <p className="text-center text-sm text-[var(--text-tertiary)]">
                No recent launches to show.
              </p>
            )}
          </section>
        </ScrollReveal>

        <ScrollReveal delay={210}>
          <section id="timeline" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="THE TIMELINE"
              title="A live view of the moments shaping the AI race"
              subtitle="Key events plotted across the last 30 days."
              tone="blue"
            />
            <InteractiveTimeline entries={timeline.slice(0, 10)} />
          </section>
        </ScrollReveal>

        <ScrollReveal delay={240}>
          <section id="trending-topics" className="scroll-mt-32 mt-20 space-y-8 lg:mt-28">
            <div className="section-rule" />
            <SectionHeader
              label="TRENDING TOPICS"
              title="The themes driving the conversation"
              subtitle="The topics surfacing across company announcements and community discussion."
              tone="purple"
            />
            <div className="flex flex-wrap gap-3">
              {trendingTopics.map((topic) => (
                <Link
                  key={topic.label}
                  href={`/news?q=${encodeURIComponent(topic.label)}`}
                  className={
                    topic.hot
                      ? "group/topic inline-flex items-center gap-2 rounded-full border border-[var(--accent-purple-border)] bg-[var(--accent-purple-soft)] px-5 py-3 text-base text-[var(--accent-purple)] transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_28px_var(--accent-purple-glow)]"
                      : "group/topic surface-card inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:scale-[1.04] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                  }
                >
                  {topic.hot ? <Flame className="h-3.5 w-3.5" /> : null}
                  <span>{topic.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 translate-x-[-4px] opacity-0 transition-all duration-200 group-hover/topic:translate-x-0 group-hover/topic:opacity-100" />
                </Link>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={270}>
          <section id="daily-digest-cta" className="scroll-mt-32 mt-20 lg:mt-28">
            <div className="surface-card relative overflow-hidden rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm lg:p-10">
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
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <section id="newsletter" className="scroll-mt-32 mt-20 lg:mt-28">
            <div className="mx-auto max-w-2xl space-y-6 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
                Stay on top of the AI race
              </h2>
              <p className="text-base text-[var(--text-secondary)]">
                Get the biggest daily moves and launches in one clean summary.
              </p>
              <NewsletterForm />
              <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                Free. No spam. Unsubscribe anytime.
              </p>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={330}>
          <section id="why-frontier-pulse" className="scroll-mt-32 mt-20 pb-10 lg:mt-28">
            <div className="mx-auto max-w-3xl space-y-5 text-center">
              <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
                WHY THIS EXISTS
              </p>
              <p className="text-lg leading-8 text-[var(--text-secondary)]">
                Most AI coverage still leaves readers to connect the dots themselves. {BRAND_NAME} pulls the major
                companies, launches, and momentum shifts into a readable competitive brief.
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
        </ScrollReveal>
      </div>
    </div>
  );
}
