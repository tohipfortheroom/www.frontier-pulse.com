import type { Metadata } from "next";

import { getCompaniesIndexData, getNewsItemsData } from "@/lib/db/queries";

import { ComparePageClient } from "@/components/compare-page-client";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare two or three AI companies side by side across momentum, product breadth, recent coverage, and shared competitive pressure.",
};

export default async function ComparePage() {
  const [records, newsItems] = await Promise.all([getCompaniesIndexData(), getNewsItemsData()]);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="COMPARE"
          title="Stack the contenders side by side"
          subtitle="Overlay momentum, news mix, strengths, weaknesses, and shared coverage so the relative shape of the race is easier to read."
          tone="blue"
        />
        <ComparePageClient records={records} newsItems={newsItems} />
      </section>
    </div>
  );
}
