import type { Metadata } from "next";

import { getCompaniesIndexData, getNewsItemsData } from "@/lib/db/queries";
import { categories } from "@/lib/seed/data";

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
  const [newsItems, companyRecords, params] = await Promise.all([
    getNewsItemsData(),
    getCompaniesIndexData(),
    searchParams,
  ]);

  const tagParam = typeof params.tag === "string" ? params.tag : undefined;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="NEWS"
          title="A clean, filterable stream of AI moves"
          subtitle="Search by company, category, urgency, and timeframe to separate what matters from what was merely announced."
          tone="amber"
        />
        <NewsPageClient newsItems={newsItems} companies={companyRecords} categories={categories} initialTagFilter={tagParam} />
      </section>
    </div>
  );
}
