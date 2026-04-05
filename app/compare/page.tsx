import type { Metadata } from "next";
import dynamicImport from "next/dynamic";

import { getCompaniesIndexData, getNewsItemsData } from "@/lib/db/queries";
import { SectionHeader } from "@/components/section-header";

const ComparePageClient = dynamicImport(
  () => import("@/components/compare-page-client").then((module) => module.ComparePageClient),
  {
    loading: () => (
      <div className="surface-card rounded-3xl border border-[var(--border)] p-6 text-sm text-[var(--text-secondary)] backdrop-blur-sm">
        Loading comparison workspace...
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare up to four AI companies side by side across momentum, radar profiles, product breadth, recent coverage, and shared competitive pressure.",
};

export const dynamic = "force-dynamic";

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
