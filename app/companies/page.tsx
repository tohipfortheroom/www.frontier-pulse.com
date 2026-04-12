import type { Metadata } from "next";

import { getCompaniesIndexData, getLeaderboardRefreshState, getSiteStatsData } from "@/lib/db/queries";

import { CompaniesIndexClient } from "@/components/companies-index-client";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { SectionHeader } from "@/components/section-header";
import { formatUpdateTimestamp } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Companies",
  description: "Browse the tracked AI companies, compare momentum, and open full editorial profiles for each player in the race.",
  openGraph: {
    title: "Companies — Frontier Pulse",
    description: "Browse the tracked AI companies, compare momentum, and open full editorial profiles for each player in the race.",
    type: "website",
    siteName: "Frontier Pulse",
  },
};

export const revalidate = 300;

export default async function CompaniesPage() {
  const [records, stats, refreshState] = await Promise.all([
    getCompaniesIndexData(),
    getSiteStatsData(),
    getLeaderboardRefreshState(),
  ]);
  const staleWarning = refreshState.status === "stale" ? refreshState.reason : null;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="COMPANIES"
          title="Follow the companies moving the AI race"
          subtitle="Search the field, compare momentum, and jump into deeper company profiles with products, strengths, weaknesses, and the latest editorial context."
          tone="blue"
        />
        <ModuleStatusStrip
          items={[
            { label: "Coverage", value: stats.lastUpdatedAt ? formatUpdateTimestamp(stats.lastUpdatedAt) : "" },
            { label: "Tracked", value: stats.trackedCompanyCount.toString() },
            { label: "Ranked", value: stats.rankedCompanyCount.toString() },
            { label: "Surface", value: `Top ${stats.leaderboardSurfaceCount}` },
          ]}
          warning={staleWarning}
        />
        <CompaniesIndexClient records={records} />
      </section>
    </div>
  );
}
