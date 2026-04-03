import { getCompaniesIndexData, getNewsItemsData } from "@/lib/db/queries";
import { categories } from "@/lib/seed/data";

import { NewsPageClient } from "@/components/news-page-client";
import { SectionHeader } from "@/components/section-header";

export default async function NewsPage() {
  const [newsItems, companyRecords] = await Promise.all([getNewsItemsData(), getCompaniesIndexData()]);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="NEWS"
          title="A clean, filterable stream of AI moves"
          subtitle="Search by company, category, urgency, and timeframe to separate what matters from what was merely announced."
          tone="amber"
        />
        <NewsPageClient newsItems={newsItems} companies={companyRecords} categories={categories} />
      </section>
    </div>
  );
}
