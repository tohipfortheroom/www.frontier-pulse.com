"use client";

import { useDeferredValue, useState } from "react";
import { differenceInDays, differenceInHours, format, subDays } from "date-fns";
import { Filter, Search } from "lucide-react";

import type { NewsItem, NewsCategory } from "@/lib/seed/data";
import type { CompanyCardRecord } from "@/lib/db/types";
import { seedNow } from "@/lib/seed/data";
import { cn } from "@/lib/utils";

import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import { Input } from "@/components/ui/input";

const selectClassName =
  "h-12 rounded-xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] px-4 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 focus:border-[rgba(77,159,255,0.45)] focus:ring-2 focus:ring-[rgba(77,159,255,0.12)]";

type NewsPageClientProps = {
  newsItems: NewsItem[];
  companies: CompanyCardRecord[];
  categories: NewsCategory[];
};

export function NewsPageClient({ newsItems, companies, categories }: NewsPageClientProps) {
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("7d");
  const [importance, setImportance] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const activityDays = Array.from({ length: 30 }, (_, index) => {
    const day = subDays(seedNow, 29 - index);
    const dateKey = format(day, "yyyy-MM-dd");
    const count = newsItems.filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === dateKey).length;

    return {
      dateKey,
      label: format(day, "MMM d"),
      count,
    };
  });

  const filteredNews = newsItems.filter((item) => {
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
    const matchesSelectedDay = !selectedDay || format(new Date(item.publishedAt), "yyyy-MM-dd") === selectedDay;

    return matchesQuery && matchesCompany && matchesCategory && matchesImportance && matchesTimeframe && matchesSelectedDay;
  });

  return (
    <>
      <div className="rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">
              Activity Heatmap
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">News volume over the last 30 days. Click a day to pin the stream to that date.</p>
          </div>
          {selectedDay ? (
            <button type="button" onClick={() => setSelectedDay(null)} className="text-sm text-[var(--accent-blue)]">
              Clear day filter
            </button>
          ) : null}
        </div>
        <div className="scrollbar-none mt-6 overflow-x-auto">
          <div className="grid min-w-max grid-flow-col grid-rows-5 gap-2">
            {activityDays.map((day) => {
              const intensity =
                day.count >= 6
                  ? "bg-[rgba(0,230,138,0.78)]"
                  : day.count >= 4
                    ? "bg-[rgba(0,230,138,0.46)]"
                    : day.count >= 2
                      ? "bg-[rgba(77,159,255,0.34)]"
                      : day.count >= 1
                        ? "bg-[rgba(255,184,77,0.28)]"
                        : "bg-[rgba(255,255,255,0.04)]";

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  title={`${day.label}: ${day.count} stories`}
                  onClick={() => setSelectedDay(day.dateKey === selectedDay ? null : day.dateKey)}
                  className={cn(
                    "h-6 w-6 rounded-md border border-[rgba(255,255,255,0.04)] transition-transform duration-150 hover:scale-105",
                    intensity,
                    selectedDay === day.dateKey && "ring-2 ring-[rgba(77,159,255,0.45)]",
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>

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
            {companies.map(({ company }) => (
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
        <span>Supabase-backed stream</span>
      </div>

      {filteredNews.length > 0 ? (
        <div className="grid gap-5">
          {filteredNews.map((item) => (
            <NewsCard key={item.slug} news={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No updates matched the current filters"
          description="Try widening the timeframe, clearing the company filter, or searching with fewer keywords."
          actionHref="/news"
          actionLabel="Reset filters"
        />
      )}
    </>
  );
}
