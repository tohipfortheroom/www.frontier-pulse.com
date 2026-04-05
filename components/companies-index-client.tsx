"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import type { CompanyCardRecord } from "@/lib/db/types";
import { matchesSearchQuery } from "@/lib/search/syntax";

import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";

type CompaniesIndexClientProps = {
  records: CompanyCardRecord[];
};

export function CompaniesIndexClient({ records }: CompaniesIndexClientProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const filteredRecords = records.filter(({ company }) => {
    if (!normalizedQuery) {
      return true;
    }

    return matchesSearchQuery(
      [
        company.name,
        company.description,
        company.overview,
        ...company.tags,
        ...company.products.map((product) => product.name),
      ].join(" "),
      normalizedQuery,
    );
  });

  return (
    <>
      <div className="surface-card rounded-2xl border border-[var(--border)] p-4 backdrop-blur-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search companies, products, or themes. Try "open-weight" OR agents'
            className="pl-11"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        <span>{filteredRecords.length} companies shown</span>
        <span>Supabase-backed index</span>
      </div>

      {filteredRecords.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecords.map((record) => (
            <CompanyCard
              key={record.company.slug}
              company={record.company}
              activityCount={record.activityCount}
              momentum={record.momentum}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No companies matched that search"
          description="Try a broader company name, product family, or theme like reasoning, chips, enterprise, or open-weight."
          actionHref="/companies"
          actionLabel="Reset search"
        />
      )}
    </>
  );
}
