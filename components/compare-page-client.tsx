"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CompanyCardRecord } from "@/lib/db/types";
import { categories, type NewsItem } from "@/lib/seed/data";
import { cn, formatScore } from "@/lib/utils";

import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import { SectionHeader } from "@/components/section-header";

function expandSeries(values: number[], targetLength = 30) {
  if (values.length >= targetLength) {
    return values.slice(values.length - targetLength);
  }

  const next: number[] = [];

  for (let index = 0; index < targetLength; index += 1) {
    const ratio = targetLength === 1 ? 0 : index / (targetLength - 1);
    const sourceIndex = ratio * (values.length - 1);
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(values.length - 1, Math.ceil(sourceIndex));
    const lower = values[lowerIndex] ?? values[0] ?? 0;
    const upper = values[upperIndex] ?? values[values.length - 1] ?? lower;
    const mix = sourceIndex - lowerIndex;
    next.push(Number((lower + (upper - lower) * mix).toFixed(2)));
  }

  return next;
}

const chartColors = ["#4D9FFF", "#00E68A", "#A78BFA"];

export function ComparePageClient({
  records,
  newsItems,
}: {
  records: CompanyCardRecord[];
  newsItems: NewsItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const selectedSlugs = useMemo(() => {
    const raw = searchParams.get("companies");
    const parsed = raw?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
    return parsed.length > 0 ? parsed.slice(0, 3) : ["openai", "anthropic"];
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedRecords = records.filter((record) => selectedSlugs.includes(record.company.slug));

  function updateSelection(nextSelection: string[]) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSelection.length > 0) {
      params.set("companies", nextSelection.join(","));
    } else {
      params.delete("companies");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleCompany(slug: string) {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((item) => item !== slug)
      : [...selectedSlugs, slug].slice(-3);

    updateSelection(next);
  }

  const overlaySeries = useMemo(() => {
    return Array.from({ length: 30 }, (_, index) => {
      const dayLabel = `D-${29 - index}`;
      const point = { dayLabel } as Record<string, string | number>;

      selectedRecords.forEach((record) => {
        const series = expandSeries(record.momentum?.sparkline ?? record.company.sparkline ?? [0]);
        point[record.company.slug] = series[index];
      });

      return point;
    });
  }, [selectedRecords]);

  const groupedCategoryData = useMemo(() => {
    return categories.map((category) => {
      const row = { category: category.name } as Record<string, string | number>;

      selectedRecords.forEach((record) => {
        row[record.company.slug] = newsItems.filter(
          (item) => item.companySlugs.includes(record.company.slug) && item.categorySlugs.includes(category.slug),
        ).length;
      });

      return row;
    });
  }, [newsItems, selectedRecords]);

  const sharedNews = newsItems.filter((item) => item.companySlugs.filter((slug) => selectedSlugs.includes(slug)).length >= 2).slice(0, 6);

  return (
    <div className="space-y-12">
      <div className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.86)] p-5 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          {records.map((record) => {
            const active = selectedSlugs.includes(record.company.slug);

            return (
              <button
                key={record.company.slug}
                type="button"
                onClick={() => toggleCompany(record.company.slug)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-all duration-200",
                  active
                    ? "border-[rgba(77,159,255,0.24)] bg-[rgba(77,159,255,0.12)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {record.company.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRecords.length >= 2 ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.86)] p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
                    Momentum Overlay
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Current scores with synthesized 30-day context for quick side-by-side reading.</p>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  {isPending ? "Updating..." : `${selectedRecords.length} selected`}
                </span>
              </div>
              <div className="mt-6 h-[320px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overlaySeries}>
                      <defs>
                        {selectedRecords.map((record, index) => (
                          <linearGradient key={record.company.slug} id={`compare-${record.company.slug}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={chartColors[index]} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={chartColors[index]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="dayLabel" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(18,18,26,0.96)",
                          border: "1px solid var(--border)",
                          borderRadius: "16px",
                        }}
                      />
                      {selectedRecords.map((record, index) => (
                        <Area
                          key={record.company.slug}
                          type="monotone"
                          dataKey={record.company.slug}
                          stroke={chartColors[index]}
                          fill={`url(#compare-${record.company.slug})`}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />
                )}
              </div>
            </div>

            <div className="grid gap-5">
              {selectedRecords.map((record, index) => (
                <div key={record.company.slug} className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.86)] p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: chartColors[index] }} />
                    <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                      {record.company.name}
                    </h3>
                  </div>
                  <p className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">
                    {formatScore(record.momentum?.score ?? 0)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {record.momentum?.keyDriver ?? record.company.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.86)] p-6 backdrop-blur-sm">
            <SectionHeader
              label="CATEGORY MIX"
              title="Recent news count by category"
              subtitle="A grouped view of where each company's coverage is clustering right now."
              tone="amber"
            />
            <div className="mt-6 h-[340px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupedCategoryData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="category" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(18,18,26,0.96)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                      }}
                    />
                    {selectedRecords.map((record, index) => (
                      <Bar key={record.company.slug} dataKey={record.company.slug} fill={chartColors[index]} radius={[8, 8, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />
              )}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            {selectedRecords.map((record) => (
              <div key={record.company.slug} className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.86)] p-6 backdrop-blur-sm">
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                  {record.company.name}
                </h3>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-green)]">Strengths</p>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {record.company.strengths.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-red)]">Weaknesses</p>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {record.company.weaknesses.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-blue)]">Key products</p>
                    <div className="mt-3 space-y-2">
                      {record.company.products.slice(0, 3).map((product) => (
                        <div key={product.name} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{product.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-6">
            <SectionHeader
              label="SHARED STORIES"
              title="Coverage that overlaps across the selected companies"
              subtitle="The stories most likely to matter when you are comparing competitive positions instead of reading one company in isolation."
              tone="purple"
            />
            {sharedNews.length > 0 ? (
              <div className="grid gap-5">
                {sharedNews.map((item) => (
                  <NewsCard key={item.slug} news={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No overlapping stories yet"
                description="These companies are moving on separate tracks in the current sample window."
                actionHref="/news"
                actionLabel="Browse all news"
              />
            )}
          </section>
        </>
      ) : (
        <EmptyState
          title="Pick at least two companies"
          description="The compare view becomes useful once we have two or three companies selected side by side."
          actionHref="/companies"
          actionLabel="Browse companies"
        />
      )}
    </div>
  );
}
