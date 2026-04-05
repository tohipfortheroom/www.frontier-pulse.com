import type { Metadata } from "next";

import { getCompaniesIndexData } from "@/lib/db/queries";

import { CompaniesIndexClient } from "@/components/companies-index-client";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Companies",
  description: "Browse the tracked AI companies, compare momentum, and open full editorial profiles for each player in the race.",
};

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const records = await getCompaniesIndexData();

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="COMPANIES"
          title="Follow the companies moving the AI race"
          subtitle="Search the field, compare momentum, and jump into deeper company profiles with products, strengths, weaknesses, and the latest editorial context."
          tone="blue"
        />
        <CompaniesIndexClient records={records} />
      </section>
    </div>
  );
}
