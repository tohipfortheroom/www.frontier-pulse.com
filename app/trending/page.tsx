import type { Metadata } from "next";

import { getTrendingTopicsData } from "@/lib/db/queries";
import { ModuleStatusStrip } from "@/components/module-status-strip";
import { SectionHeader } from "@/components/section-header";
import { formatUpdateTimestamp } from "@/lib/utils";
import { TrendingTopicsClient } from "@/components/trending-topics-client";

export const metadata: Metadata = {
  title: "Trending Topics",
  description:
    "See which AI topics are gaining momentum right now. A real-time tag cloud and ranked list of the hottest themes across the frontier AI landscape.",
};

export const revalidate = 300;

export default async function TrendingPage() {
  const topics = await getTrendingTopicsData();
  const latestPublishedAt = topics.flatMap((topic) => topic.topStories).sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())[0]?.publishedAt;
  const storyCount = topics.reduce((sum, topic) => sum + topic.count, 0);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="TRENDING TOPICS"
          title="What the AI world is talking about"
          subtitle="Tag frequency across the last 7 days of coverage, ranked by volume and colored by momentum."
          tone="purple"
        />
        <ModuleStatusStrip
          items={[
            { label: "Updated", value: latestPublishedAt ? formatUpdateTimestamp(latestPublishedAt) : "" },
            { label: "Topics", value: topics.length.toString() },
            { label: "Stories", value: storyCount.toString() },
            { label: "Window", value: "7 days" },
          ]}
        />
        <TrendingTopicsClient topics={topics} />
      </section>
    </div>
  );
}
