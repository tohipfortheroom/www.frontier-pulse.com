"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addDays, differenceInDays, differenceInHours, endOfWeek, format, startOfDay, startOfWeek, subDays } from "date-fns";
import { Filter, RefreshCcw, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/db/browser-client";
import type { SourceHealthSnapshot } from "@/lib/ingestion/source-health";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { fetchJsonWithRetry } from "@/lib/network/fetch";
import type { NewsItem, NewsCategory } from "@/lib/seed/data";
import type { CompanyCardRecord } from "@/lib/db/types";
import { matchesSearchQuery } from "@/lib/search/syntax";
import { cn, formatUpdateTimestamp } from "@/lib/utils";

import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import { Input } from "@/components/ui/input";

const selectClassName =
  "surface-card h-12 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 focus:border-[var(--accent-blue-border)] focus:ring-2 focus:ring-[var(--accent-blue-ring)]";

type NewsPageClientProps = {
  newsItems: NewsItem[];
  companies: CompanyCardRecord[];
  categories: NewsCategory[];
  initialFilters: {
    query: string;
    company: string;
    category: string;
    timeframe: string;
    importance: string;
    tag: string | null;
    day: string | null;
  };
  initialFreshness: Pick<
    SourceHealthSnapshot,
    | "configured"
    | "currentStatus"
    | "currentStatusReason"
    | "quietFeed"
    | "lastIngestionAt"
    | "lastSucceededAt"
    | "latestPublishedAt"
    | "staleData"
    | "delayed"
    | "degraded"
    | "sourceSummary"
  >;
};

export function NewsPageClient({ newsItems, companies, categories, initialFilters, initialFreshness }: NewsPageClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialFilters.query);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState(initialFilters.company);
  const [categoryFilter, setCategoryFilter] = useState(initialFilters.category);
  const [timeframe, setTimeframe] = useState(initialFilters.timeframe);
  const [importance, setImportance] = useState(initialFilters.importance);
  const [tagFilter, setTagFilter] = useState<string | null>(initialFilters.tag);
  const [selectedDay, setSelectedDay] = useState<string | null>(initialFilters.day);
  const [pendingRealtimeCount, setPendingRealtimeCount] = useState(0);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [now, setNow] = useState(new Date());
  const [freshness, setFreshness] = useState<
    Pick<
      SourceHealthSnapshot,
      | "configured"
      | "currentStatus"
      | "currentStatusReason"
      | "quietFeed"
      | "lastIngestionAt"
      | "lastSucceededAt"
      | "latestPublishedAt"
      | "staleData"
      | "delayed"
      | "degraded"
      | "sourceSummary"
    >
  >(initialFreshness);
  const pendingRealtimeSlugs = useRef(new Set<string>());
  const healthToastShownRef = useRef(false);
  const deferredQuery = useDeferredValue(query);
  const { pushToast } = useToast();
  const isOnline = useNetworkStatus();
  const heatmapEnd = useMemo(() => startOfDay(now), [now]);
  const heatmapStart = useMemo(() => subDays(heatmapEnd, 29), [heatmapEnd]);
  const activityCounts = useMemo(() => {
    const counts = new Map<string, number>();

    newsItems.forEach((item) => {
      const dateKey = format(new Date(item.publishedAt), "yyyy-MM-dd");
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    });

    return counts;
  }, [newsItems]);
  const activityDays = useMemo(
    () => {
      const gridStart = startOfWeek(heatmapStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(heatmapEnd, { weekStartsOn: 1 });
      const days: Array<{
        count: number;
        dateKey: string;
        inRange: boolean;
        isToday: boolean;
        label: string;
      }> = [];

      for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
        const dateKey = format(cursor, "yyyy-MM-dd");
        const timestamp = cursor.getTime();

        days.push({
          count: activityCounts.get(dateKey) ?? 0,
          dateKey,
          inRange: timestamp >= heatmapStart.getTime() && timestamp <= heatmapEnd.getTime(),
          isToday: timestamp === heatmapEnd.getTime(),
          label: format(cursor, "EEE, MMM d"),
        });
      }

      return days;
    },
    [activityCounts, heatmapEnd, heatmapStart],
  );

  useEffect(() => {
    pendingRealtimeSlugs.current.clear();
    setPendingRealtimeCount(0);
  }, [newsItems]);

  useEffect(() => {
    setQuery(initialFilters.query);
    setCompanyFilter(initialFilters.company);
    setCategoryFilter(initialFilters.category);
    setTimeframe(initialFilters.timeframe);
    setImportance(initialFilters.importance);
    setTagFilter(initialFilters.tag);
    setSelectedDay(initialFilters.day);
  }, [initialFilters]);

  useEffect(() => {
    setFreshness(initialFreshness);
  }, [initialFreshness]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    let active = true;

    async function loadHealth() {
      try {
        const payload = await fetchJsonWithRetry<SourceHealthSnapshot>("/api/health", {
          cache: "no-store",
          timeoutMs: 5_000,
          retries: 1,
          allowNonOk: true,
        });

        if (active) {
          setFreshness({
            configured: payload.configured,
            currentStatus: payload.currentStatus,
            currentStatusReason: payload.currentStatusReason,
            quietFeed: payload.quietFeed,
            lastIngestionAt: payload.lastIngestionAt,
            lastSucceededAt: payload.lastSucceededAt,
            latestPublishedAt: payload.latestPublishedAt,
            staleData: payload.staleData,
            delayed: payload.delayed,
            degraded: payload.degraded,
            sourceSummary: payload.sourceSummary,
          });
          healthToastShownRef.current = false;
        }
      } catch (error) {
        if (!healthToastShownRef.current) {
          pushToast({
            tone: "error",
            title: "Live status unavailable",
            description: error instanceof Error ? error.message : "Unable to refresh source health.",
          });
          healthToastShownRef.current = true;
        }
      }
    }

    void loadHealth();
    const refreshInterval = window.setInterval(() => {
      void loadHealth();
    }, 60_000);
    const nowInterval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.clearInterval(nowInterval);
    };
  }, [isOnline, pushToast]);

  const filteredNews = useMemo(
    () =>
      newsItems.filter((item) => {
        const matchesQuery =
          !deferredQuery.trim() ||
          matchesSearchQuery([item.headline, item.summary, item.shortSummary, item.whyItMatters, item.sourceName].join(" "), deferredQuery);

        const matchesCompany = companyFilter === "all" || item.companySlugs.includes(companyFilter);
        const matchesCategory = categoryFilter === "all" || item.categorySlugs.includes(categoryFilter);
        const matchesImportance = importance === "all" || item.importanceLevel.toLowerCase() === importance;

        const ageInHours = differenceInHours(now, new Date(item.publishedAt));
        const ageInDays = differenceInDays(now, new Date(item.publishedAt));
        const matchesTimeframe =
          timeframe === "24h" ? ageInHours <= 24 : timeframe === "7d" ? ageInDays <= 7 : ageInDays <= 30;
        const matchesSelectedDay = !selectedDay || format(new Date(item.publishedAt), "yyyy-MM-dd") === selectedDay;
        const matchesTag = !tagFilter || item.tagSlugs.includes(tagFilter);

        return matchesQuery && matchesCompany && matchesCategory && matchesImportance && matchesTimeframe && matchesSelectedDay && matchesTag;
      }),
    [newsItems, deferredQuery, companyFilter, categoryFilter, importance, timeframe, selectedDay, now, tagFilter],
  );

  useEffect(() => {
    if (expandedSlug && !filteredNews.some((item) => item.slug === expandedSlug)) {
      setExpandedSlug(null);
    }
  }, [expandedSlug, filteredNews]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromHash = () => {
      const hashSlug = decodeURIComponent(window.location.hash.replace(/^#/, ""));

      if (!hashSlug) {
        return;
      }

      if (!filteredNews.some((item) => item.slug === hashSlug)) {
        return;
      }

      setExpandedSlug(hashSlug);

      window.setTimeout(() => {
        const element = document.getElementById(hashSlug);

        if (!element) {
          return;
        }

        if (window.innerWidth < 768) {
          const top = element.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        } else {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 400);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [filteredNews]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("news-items-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_items" }, (payload) => {
        const slug = typeof payload.new.slug === "string" ? payload.new.slug : null;

        if (slug) {
          if (pendingRealtimeSlugs.current.has(slug)) {
            return;
          }

          pendingRealtimeSlugs.current.add(slug);
        }

        setPendingRealtimeCount((count) => count + 1);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOnline]);

  function loadRealtimeStories() {
    pendingRealtimeSlugs.current.clear();
    setPendingRealtimeCount(0);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  function updateHash(slug: string | null) {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.hash = slug ? slug : "";
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function handleExpandedChange(nextExpanded: boolean, slug: string, element: HTMLElement | null) {
    const nextSlug = nextExpanded ? slug : expandedSlug === slug ? null : expandedSlug;

    setExpandedSlug(nextSlug);
    updateHash(nextSlug);

    if (nextExpanded && element) {
      window.setTimeout(() => {
        if (window.innerWidth < 768) {
          const top = element.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          return;
        }

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 400);
    }
  }

  const recentStoriesCount = newsItems.filter((item) => differenceInHours(now, new Date(item.publishedAt)) <= 24).length;
  const freshnessReference = freshness.lastSucceededAt ?? freshness.lastIngestionAt;
  const latestStoryHoursAgo = differenceInHours(now, new Date(freshness.latestPublishedAt));
  const statusStyles =
    !freshness.configured
      ? "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)]"
      : freshness.currentStatus === "LIVE"
      ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--text-primary)]"
      : freshness.currentStatus === "STALE"
        ? "border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] text-[var(--text-primary)]"
        : "border-[var(--accent-amber-border)] bg-[var(--accent-amber-soft)] text-[var(--text-primary)]";
  const statusEyebrow =
    !freshness.configured
      ? "Preview data"
      : freshness.currentStatus === "LIVE"
      ? freshness.quietFeed
        ? "Sources checked recently"
        : "All systems live"
      : freshness.currentStatus === "DELAYED"
        ? "Ingestion delayed"
        : freshness.currentStatus === "DEGRADED"
          ? "Some sources degraded"
          : "Feed stale";
  const lastRefreshLabel = freshnessReference ? formatUpdateTimestamp(freshnessReference).toLowerCase() : "recently";
  const statusBody =
    !freshness.configured
      ? "Live pipeline is not configured in this environment. Showing the editorial seed dataset."
      : freshness.currentStatus === "LIVE"
      ? freshness.quietFeed
        ? `Sources checked ${lastRefreshLabel}. No major new developments across tracked companies right now.`
        : `Updated ${lastRefreshLabel} across tracked sources.`
      : freshness.currentStatus === "DELAYED"
        ? `Last successful refresh was ${lastRefreshLabel}. Retrying automatically.`
        : freshness.currentStatus === "DEGRADED"
          ? `${freshness.sourceSummary.degraded} of ${freshness.sourceSummary.total} sources need attention, but healthy sources are still updating the feed.`
          : `Last successful refresh was ${lastRefreshLabel}. Pipeline attention is required.`;

  if (newsItems.length === 0) {
    return (
      <EmptyState
        title="News stream unavailable"
        description="The editorial stream is temporarily empty. Try again shortly while the ingest pipeline catches up."
        actionHref="/leaderboard"
        actionLabel="Open leaderboard"
      />
    );
  }

  return (
    <>

      {pendingRealtimeCount > 0 ? (
        <button
          type="button"
          onClick={loadRealtimeStories}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--accent-green-border)] bg-[var(--accent-green-soft)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--accent-green-ring)]"
        >
          <span className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-green)] animate-[pulse_2s_infinite]" />
            {pendingRealtimeCount} new {pendingRealtimeCount === 1 ? "story" : "stories"} available
          </span>
          <span className="inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--accent-green)]">
            <RefreshCcw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing" : "Load now"}
          </span>
        </button>
      ) : null}

      <div
        className={cn("rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm", statusStyles)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{statusEyebrow}</span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {!isOnline ? "Offline" : latestStoryHoursAgo <= 0 ? "Latest story <1h ago" : `Latest story ${formatUpdateTimestamp(freshness.latestPublishedAt).toLowerCase()}`}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {statusBody} Showing {recentStoriesCount} stories from the last 24 hours.
        </p>
        {!isOnline ? (
          <p className="mt-2 text-sm text-[var(--accent-red)]">You&apos;re offline. Live updates will reconnect automatically.</p>
        ) : null}
        {isOnline && freshness.configured && freshness.currentStatus !== "LIVE" ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{freshness.currentStatusReason}</p>
        ) : null}
      </div>

      <div className="surface-card rounded-2xl border border-[var(--border)] p-4 backdrop-blur-sm">
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
        <div className="mt-6 flex items-start gap-3">
          <div className="hidden grid-rows-7 gap-2 pt-0.5 sm:grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <span
                key={label}
                className="flex h-4 items-center text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="scrollbar-none overflow-x-auto">
            <div className="inline-grid w-max grid-flow-col grid-rows-7 gap-2 justify-start">
              {activityDays.map((day) => {
                let intensity = "bg-[var(--surface-grid)]";

                if (day.count >= 6) {
                  intensity = "bg-[var(--accent-green-strong)]";
                } else if (day.count >= 4) {
                  intensity = "bg-[var(--accent-green-medium)]";
                } else if (day.count >= 2) {
                  intensity = "bg-[var(--accent-blue-medium)]";
                } else if (day.count >= 1) {
                  intensity = "bg-[var(--accent-amber-medium)]";
                }

                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    title={`${day.label}: ${day.count} stories`}
                    onClick={() => {
                      if (!day.inRange) {
                        return;
                      }

                      setSelectedDay(day.dateKey === selectedDay ? null : day.dateKey);
                    }}
                    disabled={!day.inRange}
                    className={cn(
                      "h-4 w-4 rounded-[5px] border border-[var(--border)] transition-all duration-150",
                      day.inRange ? "hover:scale-105 hover:border-[var(--border-hover)]" : "cursor-default opacity-35",
                      intensity,
                      selectedDay === day.dateKey && "ring-2 ring-[var(--accent-blue-ring)]",
                      day.isToday && "border-[var(--accent-blue-border)]",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl border border-[var(--border)] p-4 backdrop-blur-sm">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search the stream. Try "GPT-5" OR Claude -policy'
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

      {tagFilter ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Filtered by tag:</span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-3 py-1 text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent-blue-ring)]"
          >
            {tagFilter}
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>{filteredNews.length} updates shown</span>
        </div>
        <span>Supabase-backed stream</span>
      </div>

      {newsItems.length > 0 && filteredNews.length > 0 ? (
        <div className="grid gap-5">
          {filteredNews.map((item) => (
            <NewsCard
              key={item.slug}
              news={item}
              expanded={expandedSlug === item.slug}
              onExpandedChange={handleExpandedChange}
            />
          ))}
        </div>
      ) : newsItems.length > 0 ? (
        <EmptyState
          title="No updates matched the current filters"
          description="Try widening the timeframe, clearing a filter, or using a broader search with quotes and OR operators."
          actionHref="/news"
          actionLabel="Reset filters"
        />
      ) : null}
    </>
  );
}
