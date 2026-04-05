import { format } from "date-fns";
import type { Metadata } from "next";

import { getDailyDigestByDate, getDailyDigestData, getDigestArchiveDates } from "@/lib/db/queries";
import { companiesBySlug } from "@/lib/seed/data";

import { DailyDigestBlock } from "@/components/daily-digest-block";
import { DigestArchiveNav } from "@/components/digest-archive-nav";
import { SectionHeader } from "@/components/section-header";
import { ShareButton } from "@/components/share-button";
import { BRAND_DIGEST_NAME, BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Daily Digest",
  description: `Read the ${BRAND_NAME} daily digest for the ten stories that mattered most and what to watch next.`,
};

export const dynamic = "force-dynamic";

interface DailyDigestPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DailyDigestPage({ searchParams }: DailyDigestPageProps) {
  const resolvedParams = await searchParams;
  const dateParam = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;

  const [digestResult, availableDates] = await Promise.all([
    dateParam ? getDailyDigestByDate(dateParam) : getDailyDigestData(),
    getDigestArchiveDates(),
  ]);

  const { digest, topStories, biggestWinnerMomentum, biggestLoserMomentum, mostImportantStory } = digestResult;
  const winner = companiesBySlug[digest.biggestWinnerCompanySlug];
  const loser = companiesBySlug[digest.biggestLoserCompanySlug];
  const narrativeParagraphs = (digest.narrative ?? "").split("\n\n").filter(Boolean);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <DigestArchiveNav currentDate={digest.date} availableDates={availableDates} />

      <section className="fade-slide-up space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            label="DAILY DIGEST"
            title={digest.headlineOfTheDay ?? format(new Date(digest.date), "EEEE, MMMM d, yyyy")}
            subtitle={digest.summary}
            tone="blue"
          />
          <ShareButton path="/daily-digest" title={BRAND_DIGEST_NAME} text={digest.summary} />
        </div>

        <div className="surface-card rounded-3xl border border-[var(--border)] px-6 py-8 backdrop-blur-sm sm:px-8">
          <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {format(new Date(digest.date), "EEEE, MMMM d, yyyy")}
          </p>
          {digest.themes?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {digest.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-3 py-1 text-xs text-[var(--accent-blue)]"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-6 space-y-5 text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            {(narrativeParagraphs.length > 0 ? narrativeParagraphs : [digest.summary]).map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`}>
                {index === 0 ? (
                  <>
                    <span className="float-left mr-3 font-[family-name:var(--font-display)] text-6xl font-semibold leading-[0.9] text-[var(--text-primary)]">
                      {paragraph.charAt(0)}
                    </span>
                    {paragraph.slice(1)}
                  </>
                ) : (
                  paragraph
                )}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-[var(--accent-green-border)] bg-[var(--accent-green-soft)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-green)]">
              Biggest Winner
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {winner.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{biggestWinnerMomentum?.keyDriver}</p>
          </div>
          <div className="rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-red)]">
              Biggest Loser
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {loser.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{biggestLoserMomentum?.keyDriver}</p>
          </div>
          <div className="rounded-2xl border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              Most Important Launch
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {mostImportantStory.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{mostImportantStory.whyItMatters}</p>
          </div>
        </div>
      </section>

      <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.08s" }}>
        <SectionHeader label="TOP 10 STORIES" title="The day in order" tone="amber" />
        <div className="grid gap-5">
          {topStories.map((item, index) => (
            <DailyDigestBlock key={item.slug} index={index + 1} item={item} />
          ))}
        </div>
      </section>

      <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.14s" }}>
        <SectionHeader label="WHAT TO WATCH NEXT" title="Forward-looking signals" tone="purple" />
        <div className="grid gap-5 md:grid-cols-3">
          {digest.watchNext.map((item) => (
            <div
              key={item}
              className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm"
            >
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
