import type { Metadata } from "next";

import { getCompaniesIndexData, getLeaderboardRefreshState, getNewsItemsData, getSiteStatsData } from "@/lib/db/queries";
import { formatUpdateTimestamp } from "@/lib/utils";
import { ComparePageClient } from "@/components/compare-page-client";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare up to four AI companies side by side across momentum, radar profiles, product breadth, recent coverage, and shared competitive pressure.",
};

export const revalidate = 300;

export default async function ComparePage() {
  const [records, newsItems, refreshState, stats] = await Promise.all([
    getCompaniesIndexData(),
    getNewsItemsData(),
    getLeaderboardRefreshState(),
    getSiteStatsData(),
  ]);
  const latestCoverageAt = newsItems[0]?.publishedAt ?? null;
  const staleWarning = refreshState.status === "stale" ? refreshState.reason : null;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="COMPARE"
          title="Stack the contenders side by side"
          subtitle="Overlay momentum, news mix, strengths, weaknesses, and shared coverage so the relative shape of the race is easier to read."
          tone="blue"
        />
        <ModuleStatusStrip
          items={[
            { label: "Coverage", value: latestCoverageAt ? formatUpdateTimestamp(latestCoverageAt) : "" },
            { label: "Rankings", value: refreshState.lastUpdatedAt ? formatUpdateTimestamp(refreshState.lastUpdatedAt) : "Unavailable" },
            { label: "Tracked", value: stats.trackedCompanyCount.toString() },
            { label: "Ranked", value: stats.rankedCompanyCount.toString() },
            { label: "Surface", value: `Top ${stats.leaderboardSurfaceCount}` },
          ]}
          warning={staleWarning}
        />
        <ComparePageClient records={records} newsItems={newsItems} />
      </section>
    </div>
  );
}
