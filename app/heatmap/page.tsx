import type { Metadata } from "next";

import { getHeatmapData } from "@/lib/db/queries";
import { IndustryHeatmap } from "@/components/industry-heatmap";
import { SectionHeader } from "@/components/section-header";
import { formatLastUpdatedLabel } from "@/lib/utils";

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

export const dynamic = "force-dynamic";

export default async function HeatmapPage() {
  const data = await getHeatmapData();
  const lastUpdatedLabel = formatLastUpdatedLabel(data.lastUpdatedAt);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="INDUSTRY HEATMAP"
          title="30 days of AI company activity"
          subtitle="Each cell represents one company on one day. Green intensity shows positive momentum events, red shows setbacks. Click any cell to see the underlying events."
          tone="green"
        />
        {lastUpdatedLabel ? <p className="text-xs text-[var(--text-tertiary)]">{lastUpdatedLabel}</p> : null}
        <IndustryHeatmap data={data} />
      </section>
    </div>
  );
}
