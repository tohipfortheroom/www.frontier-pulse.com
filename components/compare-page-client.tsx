"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Copy } from "lucide-react";

import type { CompanyCardRecord } from "@/lib/db/types";
import { categories, type NewsItem } from "@/lib/seed/data";
import { cn, formatScore, hasMeaningfulMetric, toCompleteSentence } from "@/lib/utils";

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

const chartColors = ["var(--accent-blue)", "var(--accent-green)", "var(--accent-purple)", "var(--accent-amber)"];

function normalizeSelection(rawSelection: string[], records: CompanyCardRecord[]) {
  const available = new Set(records.map((record) => record.company.slug));
  const parsed = Array.from(new Set(rawSelection.filter((slug) => available.has(slug)))).slice(0, 4);

  if (parsed.length >= 2) {
    return parsed;
  }

  const fallback = ["openai", "anthropic"].filter((slug) => available.has(slug));

  if (fallback.length >= 2) {
    return fallback;
  }

  return records.slice(0, Math.min(2, records.length)).map((record) => record.company.slug);
}

export function ComparePageClient({
  records,
  newsItems,
  initialSelectedSlugs = [],
}: {
  records: CompanyCardRecord[];
  newsItems: NewsItem[];
  initialSelectedSlugs?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileSlug, setActiveMobileSlug] = useState<string>("openai");
  const [selectedSlugs, setSelectedSlugs] = useState(() => normalizeSelection(initialSelectedSlugs, records));

  useEffect(() => {
    const selectedFromUrl = searchParams
      .get("companies")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    setSelectedSlugs(normalizeSelection(selectedFromUrl ?? initialSelectedSlugs, records));
  }, [initialSelectedSlugs, records, searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < 768);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const selectedRecords = records.filter((record) => selectedSlugs.includes(record.company.slug));
  const detailRecords = isMobile
    ? selectedRecords.filter((record) => record.company.slug === activeMobileSlug).slice(0, 1)
    : selectedRecords;

  useEffect(() => {
    if (selectedRecords.length === 0) {
      return;
    }

    if (!selectedRecords.some((record) => record.company.slug === activeMobileSlug)) {
      setActiveMobileSlug(selectedRecords[0].company.slug);
    }
  }, [activeMobileSlug, selectedRecords]);

  function updateSelection(nextSelection: string[]) {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const normalizedSelection = normalizeSelection(nextSelection, records);

    if (normalizedSelection.length > 0) {
      params.set("companies", normalizedSelection.join(","));
    } else {
      params.delete("companies");
    }

    setSelectedSlugs(normalizedSelection);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleCompany(slug: string) {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((item) => item !== slug)
      : [...selectedSlugs, slug].slice(-4);

    updateSelection(next);
  }

  const overlaySeries = useMemo(() => {
    const windowLength = isMobile ? 7 : 30;

    return Array.from({ length: windowLength }, (_, index) => {
      const dayLabel = `D-${windowLength - 1 - index}`;
      const point = { dayLabel } as Record<string, string | number>;

      selectedRecords.forEach((record) => {
        const series = expandSeries(record.momentum?.sparkline ?? record.company.sparkline ?? [0], windowLength);
        point[record.company.slug] = series[index];
      });

      return point;
    });
  }, [isMobile, selectedRecords]);

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
  const catalystsByCompany = useMemo(() => {
    return Object.fromEntries(
      selectedRecords.map((record) => [
        record.company.slug,
        newsItems
          .filter((item) => item.companySlugs.includes(record.company.slug))
          .slice(0, 2),
      ]),
    ) as Record<string, NewsItem[]>;
  }, [newsItems, selectedRecords]);

  const [copied, setCopied] = useState(false);

  function copyComparisonLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("companies", selectedSlugs.join(","));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const radarDimensions = [
    { key: "models", label: "Model Releases" },
    { key: "partnerships", label: "Partnerships" },
    { key: "funding", label: "Funding" },
    { key: "research", label: "Research" },
    { key: "products", label: "Product Launches" },
    { key: "sentiment", label: "Avg Sentiment" },
  ] as const;

  const radarCategoryMapping: Record<string, string> = {
    models: "model-releases",
    partnerships: "partnerships",
    funding: "funding",
    research: "research",
    products: "product-launches",
    sentiment: "",
  };

  const radarData = useMemo(() => {
    return radarDimensions.map((dim) => {
      const point: Record<string, string | number> = { dimension: dim.label };

      selectedRecords.forEach((record) => {
        const companyNews = newsItems.filter((item) => item.companySlugs.includes(record.company.slug));

        if (dim.key === "sentiment") {
          const avgImportance = companyNews.length > 0
            ? companyNews.reduce((sum, item) => sum + item.importanceScore, 0) / companyNews.length
            : 0;
          point[record.company.slug] = Math.round(avgImportance * 10);
        } else {
          const categorySlug = radarCategoryMapping[dim.key];
          point[record.company.slug] = companyNews.filter((item) => item.categorySlugs.includes(categorySlug)).length;
        }
      });

      return point;
    });
  }, [newsItems, selectedRecords]);

  if (records.length === 0) {
    return (
      <EmptyState
        title="Compare data is unavailable"
        description="The compare view needs company records before it can render side-by-side analysis."
        actionHref="/companies"
        actionLabel="Browse companies"
      />
    );
  }

  return (
    <div className="space-y-12">
      <div className="surface-card rounded-3xl border border-[var(--border)] p-5 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          {records.map((record) => {
            const active = selectedSlugs.includes(record.company.slug);

            return (
              <button
                key={record.company.slug}
                type="button"
                onClick={() => toggleCompany(record.company.slug)}
                className={cn(
                  "min-h-[44px] rounded-full border px-4 py-2 text-sm transition-all duration-200 md:flex-none",
                  "w-full sm:w-auto",
                  active
                    ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={copyComparisonLink}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--accent-blue-border)] hover:text-[var(--text-primary)]"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--accent-green)]" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy comparison link"}
            </button>
          </div>

          <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
            <div className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
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
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="dayLabel" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-card)",
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
                  <div className="surface-subtle h-full w-full rounded-3xl border border-[var(--border)]" />
                )}
              </div>
            </div>

            <div className="grid gap-5">
              {detailRecords.map((record) => {
                const colorIndex = Math.max(0, selectedRecords.findIndex((item) => item.company.slug === record.company.slug));

                return (
                  <div key={record.company.slug} className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: chartColors[colorIndex] }} />
                      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                        {record.company.name}
                      </h3>
                    </div>
                    <p className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">
                      {record.momentum && hasMeaningfulMetric(record.momentum.score) ? formatScore(record.momentum.score) : "Score pending"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {toCompleteSentence(record.momentum?.keyDriver ?? record.company.description)}
                    </p>
                  </div>
                );
              })}

              {isMobile && selectedRecords.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedRecords.map((record) => (
                    <button
                      key={record.company.slug}
                      type="button"
                      onClick={() => setActiveMobileSlug(record.company.slug)}
                      className={cn(
                        "min-h-[44px] rounded-full border px-3 py-2 text-sm transition-colors",
                        activeMobileSlug === record.company.slug
                          ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]",
                      )}
                    >
                      {record.company.shortName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
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
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="category" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-card)",
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
                <div className="surface-subtle h-full w-full rounded-3xl border border-[var(--border)]" />
              )}
            </div>
          </section>

          <section className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
            <SectionHeader
              label="RADAR COMPARISON"
              title="Multi-dimensional view"
              subtitle="How each company stacks up across model releases, partnerships, funding, research, product launches, and average sentiment."
              tone="purple"
            />
            <div className="mt-6 flex justify-center">
              <div className="h-[400px] w-full max-w-[560px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      />
                      {selectedRecords.map((record, index) => (
                        <Radar
                          key={record.company.slug}
                          name={record.company.name}
                          dataKey={record.company.slug}
                          stroke={chartColors[index]}
                          fill={chartColors[index]}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      ))}
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "16px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="surface-subtle h-full w-full rounded-3xl border border-[var(--border)]" />
                )}
              </div>
            </div>
          </section>

          <section className={cn("grid gap-5", isMobile ? "" : selectedRecords.length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
            {detailRecords.map((record) => (
              <div key={record.company.slug} className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
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
                        <div key={product.name} className="surface-soft rounded-2xl border border-[var(--border)] p-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{product.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {catalystsByCompany[record.company.slug]?.length ? (
                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">Recent catalysts</p>
                      <div className="mt-3 space-y-2">
                        {catalystsByCompany[record.company.slug].map((story) => (
                          <div key={story.slug} className="surface-soft rounded-2xl border border-[var(--border)] p-3">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{story.headline}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{toCompleteSentence(story.whyItMatters || story.shortSummary || story.summary)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
