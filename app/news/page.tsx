"use client";

import { useDeferredValue, useState } from "react";
import { differenceInHours, differenceInDays } from "date-fns";
import { Filter, Search } from "lucide-react";

import { categories, companies, seedNow, sortedNewsItems } from "@/lib/seed/data";

import { NewsCard } from "@/components/news-card";
import { SectionHeader } from "@/components/section-header";
import { Input } from "@/components/ui/input";

const selectClassName =
  "h-12 rounded-xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] px-4 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 focus:border-[rgba(77,159,255,0.45)] focus:ring-2 focus:ring-[rgba(77,159,255,0.12)]";

export default function NewsPage() {
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("7d");
  const [importance, setImportance] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const filteredNews = sortedNewsItems.filter((item) => {
    const matchesQuery =
      !deferredQuery.trim() ||
      [item.headline, item.summary, item.whyItMatters]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery.trim().toLowerCase());

    const matchesCompany = companyFilter === "all" || item.companySlugs.includes(companyFilter);
    const matchesCategory = categoryFilter === "all" || item.categorySlugs.includes(categoryFilter);
    const matchesImportance = importance === "all" || item.importanceLevel.toLowerCase() === importance;

    const ageInHours = differenceInHours(seedNow, new Date(item.publishedAt));
    const ageInDays = differenceInDays(seedNow, new Date(item.publishedAt));
    const matchesTimeframe =
      timeframe === "24h" ? ageInHours <= 24 : timeframe === "7d" ? ageInDays <= 7 : ageInDays <= 30;

    return matchesQuery && matchesCompany && matchesCategory && matchesImportance && matchesTimeframe;
  });

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="NEWS"
          title="A clean, filterable stream of AI moves"
          subtitle="Search by company, category, urgency, and timeframe to separate what matters from what was merely announced."
          tone="amber"
        />

        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-4 backdrop-blur-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the stream"
                className="pl-11"
              />
            </div>
            <select className={selectClassName} value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">All companies</option>
              {companies.map((company) => (
                <option key={company.slug} value={company.slug}>
                  {company.name}
                </option>
              ))}
            </select>
            <select className={selectClassName} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className={selectClassName} value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
            </select>
            <select className={selectClassName} value={importance} onChange={(event) => setImportance(event.target.value)}>
              <option value="all">All importance</option>
              <option value="critical">Critical</option>
              <option value="notable">Notable</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>{filteredNews.length} updates shown</span>
          </div>
          <span>Seed date: Apr 3, 2026</span>
        </div>

        <div className="grid gap-5">
          {filteredNews.map((item) => (
            <NewsCard key={item.slug} news={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
