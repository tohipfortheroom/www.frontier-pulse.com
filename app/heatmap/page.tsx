import type { Metadata } from "next";

import { getHeatmapData, getSiteLastUpdatedAt } from "@/lib/db/queries";
import { IndustryHeatmap } from "@/components/industry-heatmap";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { SectionHeader } from "@/components/section-header";
import { formatUpdateTimestamp } from "@/lib/utils";
import { buildSectionFreshness } from "@/lib/surface-data";

export const metadata: Metadata = {
  title: "Heatmap",
  description:
    "A 30-day calendar heatmap of AI company activity. See which companies are surging, which are quiet, and how overall industry momentum shifts day by day.",
  openGraph: {
    title: "Heatmap — Frontier Pulse",
    description: "A 30-day calendar heatmap of AI company activity. See which companies are surging and how momentum shifts day by day.",
    type: "website",
    siteName: "Frontier Pulse",
  },
};

export const revalidate = 600;

export default async function HeatmapPage() {
  const [data, siteLastUpdatedAt] = await Promise.all([getHeatmapData(), getSiteLastUpdatedAt()]);
  const eventCount = data.cells.reduce((sum, cell) => sum + cell.eventCount, 0);
  const freshness = buildSectionFreshness({
    cacheKey: "heatmap:page",
    generatedAt: new Date().toISOString(),
    newestContentAt: data.lastUpdatedAt,
    contentCount: eventCount,
    staleAfterHours: 48,
    now: siteLastUpdatedAt ?? new Date().toISOString(),
  });
  const staleWarning =
    freshness.stale && freshness.newestContentAt
      ? `Heatmap activity is behind the news feed. The visible event surface last refreshed ${formatUpdateTimestamp(freshness.newestContentAt).toLowerCase()}.`
      : null;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="INDUSTRY HEATMAP"
          title="30 days of AI company activity"
          subtitle="Each cell represents one company on one day. Green intensity shows positive momentum events, red shows setbacks. Click any cell to see the underlying events."
          tone="green"
        />
        <ModuleStatusStrip
          items={[
            { label: "Updated", value: data.lastUpdatedAt ? formatUpdateTimestamp(data.lastUpdatedAt) : "" },
            { label: "Events", value: eventCount.toString() },
            { label: "Companies", value: data.companies.length.toString() },
            { label: "Window", value: "30 days" },
          ]}
          warning={staleWarning}
        />
        <IndustryHeatmap data={data} />
      </section>
    </div>
  );
}
