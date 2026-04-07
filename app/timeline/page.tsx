import type { Metadata } from "next";
import dynamicImport from "next/dynamic";

import { getFullTimelineData } from "@/lib/db/queries";
import { SectionHeader } from "@/components/section-header";

const TimelinePageClient = dynamicImport(
  () => import("@/components/timeline-page-client").then((module) => module.TimelinePageClient),
  {
    loading: () => (
      <div className="surface-card rounded-3xl border border-[var(--border)] p-6 text-sm text-[var(--text-secondary)] backdrop-blur-sm">
        Loading timeline...
      </div>
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

export const revalidate = 300;

export default async function TimelinePage() {
  const data = await getFullTimelineData(14);

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="FULL TIMELINE"
          title="Every move, day by day"
          subtitle="Browse the last two weeks of AI frontier activity in chronological order. Filter by company to focus on the players that matter to you."
          tone="purple"
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
