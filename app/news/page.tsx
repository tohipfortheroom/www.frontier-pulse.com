import type { Metadata } from "next";

import { getCompaniesIndexData, getNewsItemsData } from "@/lib/db/queries";
import { sourceRegistry } from "@/lib/ingestion/pipeline";
import { getSourceHealthSnapshot } from "@/lib/ingestion/source-health";
import { categories } from "@/lib/seed/data";
import { formatUpdateTimestamp } from "@/lib/utils";

import { ModuleStatusStrip } from "@/components/module-status-strip";
import { NewsPageClient } from "@/components/news-page-client";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "News",
  description: "Filter the AI competitive intelligence stream by company, category, timeframe, and importance to find the signal that matters.",
};

export const dynamic = "force-dynamic";

type NewsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const [newsItems, companyRecords, freshness, params] = await Promise.all([
    getNewsItemsData(),
    getCompaniesIndexData(),
    getSourceHealthSnapshot(sourceRegistry),
    searchParams,
  ]);
  const initialFilters = {
    query: typeof params.q === "string" ? params.q : "",
    company: typeof params.company === "string" ? params.company : "all",
    category: typeof params.category === "string" ? params.category : "all",
    timeframe: typeof params.timeframe === "string" ? params.timeframe : "7d",
    importance: typeof params.importance === "string" ? params.importance : "all",
    tag: typeof params.tag === "string" ? params.tag : null,
    day: typeof params.day === "string" ? params.day : null,
  } as const;
  const latestPublishedAt = newsItems[0]?.publishedAt ?? freshness.latestPublishedAt;
  const staleWarning =
    freshness.currentStatus === "STALE" || freshness.staleData
      ? "The live ingest is behind. News cards remain visible, but freshness badges reflect the last successful source update."
      : null;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="NEWS"
          title="A clean, filterable stream of AI moves"
          subtitle="Search by company, category, urgency, and timeframe to separate what matters from what was merely announced."
          tone="amber"
        />
        <ModuleStatusStrip
          items={[
            { label: "Updated", value: latestPublishedAt ? formatUpdateTimestamp(latestPublishedAt) : "" },
            { label: "Stories", value: newsItems.length.toString() },
            { label: "Sources", value: freshness.sourceSummary.total.toString() },
            { label: "Window", value: "Live stream" },
          ]}
          warning={staleWarning}
        />
        <NewsPageClient
          newsItems={newsItems}
          companies={companyRecords}
          categories={categories}
          initialFilters={initialFilters}
          initialFreshness={freshness}
        />
      </section>
    </div>
  );
}
