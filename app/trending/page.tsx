import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

import { getTrendingTopicsData } from "@/lib/db/queries";
import { SectionHeader } from "@/components/section-header";

const TrendingTopicsClient = nextDynamic(() =>
  import("@/components/trending-topics-client").then((mod) => mod.TrendingTopicsClient),
);

export const metadata: Metadata = {
  title: "Trending Topics — Frontier Pulse",
  description:
    "See which AI topics are gaining momentum right now. A real-time tag cloud and ranked list of the hottest themes across the frontier AI landscape.",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const topics = await getTrendingTopicsData();

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="TRENDING TOPICS"
          title="What the AI world is talking about"
          subtitle="Tag frequency across the last 7 days of coverage, ranked by volume and colored by momentum."
          tone="purple"
        />
        <TrendingTopicsClient topics={topics} />
      </section>
    </div>
  );
}
