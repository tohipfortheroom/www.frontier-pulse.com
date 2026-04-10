import { format } from "date-fns";
import type { Metadata } from "next";

import { getDailyDigestByDate, getDailyDigestData, getDigestArchiveDates, getSiteLastUpdatedAt } from "@/lib/db/queries";
import { categories, companiesBySlug } from "@/lib/seed/data";

import { CompanyBadge } from "@/components/company-badge";
import { DailyDigestBlock } from "@/components/daily-digest-block";
import { DigestArchiveNav } from "@/components/digest-archive-nav";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { SectionHeader } from "@/components/section-header";
import { ShareButton } from "@/components/share-button";
import { BRAND_DIGEST_NAME, BRAND_NAME } from "@/lib/brand";
import { formatLastUpdatedLabel, formatLongDate, formatUpdateTimestamp, toCompleteSentence } from "@/lib/utils";

export async function generateMetadata({ searchParams }: DailyDigestPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await searchParams;
    const dateParam = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;
    const digestResult = dateParam ? await getDailyDigestByDate(dateParam) : await getDailyDigestData();
    const digestDate = digestResult.digest.date;
    const leadStory = digestResult.leadStory;
    const title = `Daily Digest — ${digestDate}`;
    const description = toCompleteSentence(leadStory.shortSummary || leadStory.summary || leadStory.whyItMatters || digestResult.digest.summary)
      || `Read the ${BRAND_NAME} daily digest for ${digestDate}: the stories that mattered most and what to watch next.`;

    return {
      title,
      description,
      openGraph: { title: `${title} — ${BRAND_NAME}`, description, type: "article", siteName: BRAND_NAME },
    };
  } catch {
    return {
      title: "Daily Digest",
      description: `Read the ${BRAND_NAME} daily digest for the stories that mattered most and what to watch next.`,
    };
  }
}

export const dynamic = "force-dynamic";

interface DailyDigestPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DailyDigestPage({ searchParams }: DailyDigestPageProps) {
  const resolvedParams = await searchParams;
  const dateParam = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;

  const [digestResult, availableDates, siteLastUpdatedAt] = await Promise.all([
    dateParam ? getDailyDigestByDate(dateParam) : getDailyDigestData(),
    getDigestArchiveDates(),
    getSiteLastUpdatedAt(),
  ]);

  const { digest, leadStory, topStories, biggestWinnerMomentum, biggestLoserMomentum, mostImportantStory } = digestResult;
  const winner = companiesBySlug[digest.biggestWinnerCompanySlug];
  const loser = companiesBySlug[digest.biggestLoserCompanySlug];
  const narrativeParagraphs = (digest.narrative ?? "").split("\n\n").filter(Boolean);
  const lastUpdatedLabel = formatLastUpdatedLabel(digestResult.lastUpdatedAt);
  const leadStorySummary = toCompleteSentence(leadStory.shortSummary || leadStory.summary || leadStory.whyItMatters || digest.summary);
  const leadStoryCategories = leadStory.categorySlugs
    .map((slug) => categories.find((category) => category.slug === slug)?.name ?? slug.replace(/-/g, " "))
    .slice(0, 3);
  const staleWarning =
    siteLastUpdatedAt && digestResult.lastUpdatedAt && new Date(siteLastUpdatedAt).getTime() - new Date(digestResult.lastUpdatedAt).getTime() > 36 * 36e5
      ? `The digest is older than the main news stream. Newer stories may already be visible elsewhere on the site.`
      : null;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <DigestArchiveNav currentDate={digest.date} availableDates={availableDates} />

      <section className="fade-slide-up space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            label="DAILY DIGEST"
            title={leadStory.headline}
            subtitle={leadStorySummary}
            tone="blue"
          />
          <ShareButton path="/daily-digest" title={BRAND_DIGEST_NAME} text={leadStorySummary} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="rounded-full border border-[var(--border)] px-3 py-1">{leadStory.sourceName}</span>
          {leadStory.companySlugs.map((companySlug) => (
            <CompanyBadge key={`lead-${leadStory.slug}-${companySlug}`} companySlug={companySlug} />
          ))}
          {leadStoryCategories.map((category) => (
            <span
              key={`lead-category-${category}`}
              className="rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-3 py-1 text-[var(--accent-blue)]"
            >
              {category}
            </span>
          ))}
        </div>
        <ModuleStatusStrip
          items={[
            { label: "Generated", value: digestResult.lastUpdatedAt ? formatUpdateTimestamp(digestResult.lastUpdatedAt) : "" },
            { label: "Stories", value: topStories.length.toString() },
            { label: "Lead source", value: leadStory.sourceName },
            { label: "Window", value: digest.date },
          ]}
          warning={staleWarning}
        />
        {lastUpdatedLabel ? (
          <p className="text-xs text-[var(--text-tertiary)]">{lastUpdatedLabel}</p>
        ) : null}

        <div className="surface-card rounded-3xl border border-[var(--border)] px-6 py-8 backdrop-blur-sm sm:px-8">
          <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {formatLongDate(digest.date)}
          </p>
          {leadStoryCategories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {leadStoryCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-3 py-1 text-xs text-[var(--accent-blue)]"
                >
                  {category}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-6 space-y-5 text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            {(narrativeParagraphs.length > 0 ? narrativeParagraphs : [toCompleteSentence(digest.summary)]).filter(Boolean).map((paragraph, index) => (
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
          {winner && biggestWinnerMomentum ? (
          <div className="rounded-2xl border border-[var(--accent-green-border)] bg-[var(--accent-green-soft)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-green)]">
              Biggest Winner
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {winner.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(biggestWinnerMomentum.keyDriver)}</p>
          </div>
          ) : null}
          {loser && biggestLoserMomentum ? (
          <div className="rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-red)]">
              Biggest Loser
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {loser.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(biggestLoserMomentum.keyDriver)}</p>
          </div>
          ) : null}
          <div className="rounded-2xl border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              Most Important Story
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {mostImportantStory.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {toCompleteSentence(mostImportantStory.whyItMatters || mostImportantStory.summary)}
            </p>
          </div>
        </div>
      </section>

      {topStories.length > 0 ? (
        <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.08s" }}>
          <SectionHeader label="TOP 10 STORIES" title="The day in order" tone="amber" />
          <div className="grid gap-5">
            {topStories.map((item, index) => (
              <DailyDigestBlock key={item.slug} index={index + 1} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {digest.watchNext.length > 0 ? (
        <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.14s" }}>
          <SectionHeader label="WHAT TO WATCH NEXT" title="Forward-looking signals" tone="purple" />
          <div className="grid gap-5 md:grid-cols-3">
            {digest.watchNext.map((item) => (
              <div
                key={item}
                className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm"
              >
                <p className="text-sm leading-7 text-[var(--text-secondary)]">{toCompleteSentence(item)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
