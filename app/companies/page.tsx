"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { companies, getCompanyMomentum } from "@/lib/seed/data";

import { CompanyCard } from "@/components/company-card";
import { SectionHeader } from "@/components/section-header";
import { Input } from "@/components/ui/input";

const sortedCompanies = [...companies].sort((left, right) => {
  const leftMomentum = getCompanyMomentum(left.slug)?.rank ?? 999;
  const rightMomentum = getCompanyMomentum(right.slug)?.rank ?? 999;
  return leftMomentum - rightMomentum;
});

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredCompanies = sortedCompanies.filter((company) => {
    if (!normalizedQuery) {
      return true;
    }

    return [company.name, company.description, company.overview, ...company.tags]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="COMPANIES"
          title="Follow the companies moving the AI race"
          subtitle="Search the field, compare momentum, and jump into deeper company profiles with products, strengths, weaknesses, and the latest editorial context."
          tone="blue"
        />

        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-4 backdrop-blur-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search companies, products, or themes"
              className="pl-11"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          <span>{filteredCompanies.length} companies shown</span>
          <span>April 2026 seed universe</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCompanies.map((company) => (
            <CompanyCard key={company.slug} company={company} />
          ))}
        </div>
      </section>
    </div>
  );
}
