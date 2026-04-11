import type { Metadata } from "next";
import dynamicImport from "next/dynamic";

import { getFullTimelineData, getSiteLastUpdatedAt } from "@/lib/db/queries";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { SectionHeader } from "@/components/section-header";
import { formatUpdateTimestamp } from "@/lib/utils";
import { buildSectionFreshness } from "@/lib/surface-data";

const TimelinePageClient = dynamicImport(
  () => import("@/components/timeline-page-client").then((module) => module.TimelinePageClient),
  {
    loading: () => (
      <div className="surface-card h-[420px] rounded-3xl border border-[var(--border)] backdrop-blur-sm" aria-hidden="true" />
    ),
  },
);

export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await getFullTimelineData(14);
    const eventCount = data.entries.length;
    const description = `${eventCount} events across 14 days. A day-by-day vertical timeline of every move in the AI frontier race.`;

    return {
      title: "Timeline",
      description,
      openGraph: { title: "Timeline — Frontier Pulse", description, type: "website", siteName: "Frontier Pulse" },
    };
  } catch {
    return {
      title: "Timeline",
      description: "A day-by-day vertical timeline of every move in the AI frontier race.",
    };
  }
}

export const revalidate = 600;

export default async function TimelinePage() {
  const [data, siteLastUpdatedAt] = await Promise.all([getFullTimelineData(14), getSiteLastUpdatedAt()]);
  const freshness = buildSectionFreshness({
    cacheKey: "timeline:page",
    generatedAt: new Date().toISOString(),
    newestContentAt: data.lastUpdatedAt,
    contentCount: data.entries.length,
    staleAfterHours: 48,
    now: siteLastUpdatedAt ?? new Date().toISOString(),
  });
  const staleWarning =
    freshness.stale && freshness.newestContentAt
      ? `Timeline events are behind the main news feed. The visible chronology last refreshed ${formatUpdateTimestamp(freshness.newestContentAt).toLowerCase()}.`
      : null;

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="FULL TIMELINE"
          title="Every move, day by day"
          subtitle="Browse the last two weeks of AI frontier activity in chronological order. Filter by company to focus on the players that matter to you."
          tone="purple"
        />
        <ModuleStatusStrip
          items={[
            { label: "Updated", value: data.lastUpdatedAt ? formatUpdateTimestamp(data.lastUpdatedAt) : "" },
            { label: "Events", value: data.entries.length.toString() },
            { label: "Companies", value: data.companies.length.toString() },
            { label: "Window", value: "14 days" },
          ]}
          warning={staleWarning}
        />
        <TimelinePageClient
          entries={data.entries}
          newsItems={data.newsItems}
          companies={data.companies}
        />
      </section>
    </div>
  );
}
