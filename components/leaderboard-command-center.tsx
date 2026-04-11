"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Radar, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TooltipContentProps } from "recharts";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CompanyCardRecord, LeaderboardRefreshState } from "@/lib/db/types";
import { getSupabaseBrowserClient } from "@/lib/db/browser-client";
import { buildHistoryChartSeries, formatTrendPercent, getTrendPercentTone, type HistoryWindow, type TrendPercentDelta } from "@/lib/score-history";
import { getLeaderboardRangeLabel } from "@/lib/surface-data";
import { cn, formatLastUpdatedLabel, formatScore, hasMeaningfulMetric, toCompleteSentence } from "@/lib/utils";

import { CompanyLogo } from "@/components/company-logo";
import styles from "@/components/leaderboard-command-center.module.css";

type RecentEvent = {
  companySlug: string;
  eventType: string;
  scoreDelta: number;
  explanation: string;
  headline: string;
};

type LeaderboardCommandCenterProps = {
  records: CompanyCardRecord[];
  recentEvents: RecentEvent[];
  refreshState: LeaderboardRefreshState;
};

type FilterId = "7d" | "30d" | "90d" | "all" | "momentum";
type ChartWindow = HistoryWindow;

type LeaderboardEntry = {
  company: CompanyCardRecord["company"];
  activityCount: number;
  rank: number;
  score: number;
  scoreChange24h: number;
  scoreChange7d: number;
  trend: string;
  keyDriver: string;
  sparkline: number[];
  history: NonNullable<CompanyCardRecord["momentum"]>["history"];
  trendPercent7d: TrendPercentDelta;
};

type NotableMover = {
  id: string;
  label: string;
  direction: "up" | "down";
  deltaLabel: string;
  timeframe: string;
  entry: LeaderboardEntry;
};

const FILTERS: Array<{
  id: FilterId;
  label: string;
  description: string;
}> = [
  { id: "7d", label: "7 Days", description: "Seven-day composite weighting" },
  { id: "30d", label: "30 Days", description: "Medium-horizon compounding lens" },
  { id: "90d", label: "90 Days", description: "Longer durability weighting" },
  { id: "all", label: "All Time", description: "Pure composite score ranking" },
  { id: "momentum", label: "Momentum", description: "Acceleration-first ranking lens" },
];

const CHART_FALLBACK_COLORS = [
  "#5ba2ff",
  "#f5b74a",
  "#8dc3ff",
  "#d7dce5",
  "#3bc9ff",
  "#8e72ff",
  "#94d82d",
  "#fb7185",
  "#7dd3fc",
  "#fb923c",
];

function sparklinePath(data: number[], width = 120, height = 38) {
  const values = data.filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return {
      points: [] as Array<{ x: number; y: number }>,
      polyline: "",
      fillPath: "",
    };
  }

  if (values.length === 1) {
    const point = { x: width / 2, y: height / 2 };

    return {
      points: [point],
      polyline: `${point.x},${point.y}`,
      fillPath: "",
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);

  const points = values.map((value, index) => {
    const x = Number((index * stepX).toFixed(2));
    const y = Number((height - ((value - min) / range) * (height - 6) - 3).toFixed(2));
    return { x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const fillPath = `M 0 ${height} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${width} ${height} Z`;

  return {
    points,
    polyline,
    fillPath,
  };
}

function formatCompactDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function getTrendPercentValue(trend: TrendPercentDelta) {
  return trend.status === "percent" && typeof trend.value === "number" ? trend.value : null;
}

function getLensScore(entry: LeaderboardEntry, filter: FilterId) {
  switch (filter) {
    case "7d":
      return entry.score + entry.scoreChange7d * 0.7;
    case "30d":
      return entry.score + entry.scoreChange7d * 1.05 + entry.scoreChange24h * 0.8;
    case "90d":
      return entry.score + entry.scoreChange7d * 1.35 + entry.activityCount * 0.12;
    case "momentum":
      return entry.score * 0.58 + entry.scoreChange7d * 6 + entry.scoreChange24h * 3.8;
    case "all":
    default:
      return entry.score;
  }
}

function getTrendIcon(value: number | null) {
  if (typeof value !== "number" || value === 0) {
    return TrendingUp;
  }

  return value > 0 ? ArrowUpRight : ArrowDownRight;
}

function podiumTone(index: number) {
  if (index === 0) {
    return "gold";
  }

  if (index === 1) {
    return "silver";
  }

  return "bronze";
}

function HistoryTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const fullLabel = typeof payload[0]?.payload?.fullLabel === "string" ? payload[0].payload.fullLabel : String(label ?? "");

  const rows = [...payload]
    .filter((entry) => typeof entry.value === "number" && typeof entry.name === "string")
    .sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0));

  return (
    <div className={styles.comparisonTooltip}>
      <p className={styles.tooltipLabel}>{fullLabel}</p>
      <div className={styles.tooltipList}>
        {rows.map((entry) => (
          <div key={String(entry.name)} className={styles.tooltipRow}>
            <span className={styles.tooltipName}>
              <span className={styles.tooltipDot} style={{ backgroundColor: String(entry.color ?? "var(--cyan)") }} />
              {entry.name}
            </span>
            <span className={styles.tooltipValue}>{formatScore(Number(entry.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardCommandCenter({ records, recentEvents, refreshState }: LeaderboardCommandCenterProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [chartWindow, setChartWindow] = useState<ChartWindow>(30);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("leaderboard-command-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "momentum_scores" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const allEntries = records
    .filter(
      (record): record is CompanyCardRecord & { momentum: NonNullable<CompanyCardRecord["momentum"]> } =>
        Boolean(record.momentum && hasMeaningfulMetric(record.momentum.score)),
    )
    .map<LeaderboardEntry>((record) => {
      const trendPercent7d =
        record.momentum.trendPercent7d ?? {
          status: "na" as const,
          value: null,
          baselineDate: null,
          baselineScore: null,
          currentDate: record.momentum.history?.at(-1)?.date ?? null,
          currentScore: record.momentum.score,
          windowDays: 7,
        };

      return {
        company: record.company,
        activityCount: record.activityCount,
        rank: record.momentum.rank,
        score: record.momentum.score,
        scoreChange24h: record.momentum.scoreChange24h,
        scoreChange7d: record.momentum.scoreChange7d,
        trend: record.momentum.trend,
        keyDriver: toCompleteSentence(record.momentum.keyDriver),
        sparkline: record.momentum.sparkline,
        history: record.momentum.history,
        trendPercent7d,
      };
    });

  const sortedEntries =
    activeFilter === "all"
      ? allEntries.slice(0, 10)
      : [...allEntries].sort((left, right) => getLensScore(right, activeFilter) - getLensScore(left, activeFilter)).slice(0, 10);

  const rankedEntries = sortedEntries.map((entry, index) => ({
    ...entry,
    displayRank: index + 1,
    sevenDayPercentValue: getTrendPercentValue(entry.trendPercent7d),
    sevenDayPercentLabel: formatTrendPercent(entry.trendPercent7d),
    sevenDayPercentTone: getTrendPercentTone(entry.trendPercent7d),
  }));

  const podiumEntries = rankedEntries.slice(0, 3);
  const remainingEntries = rankedEntries.slice(3, 10);
  const comparisonEntries = rankedEntries.slice(0, 10).map((entry, index) => ({
    ...entry,
    lineColor: entry.company.color || CHART_FALLBACK_COLORS[index % CHART_FALLBACK_COLORS.length],
  }));
  const comparisonHistory = buildHistoryChartSeries(
    comparisonEntries.map((entry) => ({
      companySlug: entry.company.slug,
      history: entry.history,
    })),
    chartWindow,
  );
  const comparisonSeries = comparisonHistory.series;
  const biggestMover =
    [...rankedEntries]
      .filter((entry) => typeof entry.sevenDayPercentValue === "number")
      .sort((left, right) => (right.sevenDayPercentValue ?? 0) - (left.sevenDayPercentValue ?? 0))[0] ?? rankedEntries[0];
  const risingStar =
    [...rankedEntries]
      .filter((entry) => entry.displayRank > 3 && typeof entry.sevenDayPercentValue === "number")
      .sort((left, right) => (right.sevenDayPercentValue ?? 0) - (left.sevenDayPercentValue ?? 0))[0] ??
    rankedEntries.find((entry) => entry.displayRank > 3) ??
    rankedEntries[0];
  const positiveEvents = recentEvents.filter((event) => event.scoreDelta > 0).length;
  const modelPush = recentEvents.filter((event) => /model|launch|benchmark|reasoning/i.test(event.eventType)).length;
  const trendAlertTitle =
    modelPush >= 4
      ? "Model launches are setting the tempo"
      : positiveEvents >= Math.ceil(recentEvents.length * 0.7)
        ? "The board is in accumulation mode"
        : "Momentum is rotating across the field";
  const trendAlertBody =
    modelPush >= 4
      ? "The strongest recent signals are still coming from model rollouts and benchmark claims, which is keeping capability leadership front and center."
      : positiveEvents >= Math.ceil(recentEvents.length * 0.7)
        ? "More companies are gaining than slipping right now, which usually means the next ranking update rewards execution depth rather than one-off hype."
        : "Recent events are spread across partnerships, infrastructure, and leadership, so competitive advantage is being won through operational follow-through.";
  const lastUpdatedLabel = formatLastUpdatedLabel(refreshState.lastUpdatedAt);
  const timestampCopy =
    refreshState.status === "running"
      ? refreshState.reason
      : lastUpdatedLabel
        ? lastUpdatedLabel
        : refreshState.reason;
  const rankingsLabel = getLeaderboardRangeLabel(remainingEntries.length);
  const notableMoverSpecs: Array<{
    id: string;
    label: string;
    timeframe: string;
    direction: "up" | "down";
    items: LeaderboardEntry[];
    getDeltaLabel: (entry: LeaderboardEntry) => string;
  }> = [
    {
      id: "sharpest-climb",
      label: "Sharpest Climb",
      timeframe: "7d",
      direction: "up",
      items: [...allEntries]
        .filter((entry) => {
          const value = getTrendPercentValue(entry.trendPercent7d);
          return typeof value === "number" && value > 0;
        })
        .sort((left, right) => (getTrendPercentValue(right.trendPercent7d) ?? 0) - (getTrendPercentValue(left.trendPercent7d) ?? 0)),
      getDeltaLabel: (entry) => formatTrendPercent(entry.trendPercent7d),
    },
    {
      id: "sharpest-drop",
      label: "Sharpest Drop",
      timeframe: "7d",
      direction: "down",
      items: [...allEntries]
        .filter((entry) => {
          const value = getTrendPercentValue(entry.trendPercent7d);
          return typeof value === "number" && value < 0;
        })
        .sort((left, right) => (getTrendPercentValue(left.trendPercent7d) ?? 0) - (getTrendPercentValue(right.trendPercent7d) ?? 0)),
      getDeltaLabel: (entry) => formatTrendPercent(entry.trendPercent7d),
    },
    {
      id: "Biggest 24h Jump",
      label: "Biggest 24h Jump",
      timeframe: "24h",
      direction: "up",
      items: [...allEntries].filter((entry) => entry.scoreChange24h > 0).sort((left, right) => right.scoreChange24h - left.scoreChange24h),
      getDeltaLabel: (entry) => formatCompactDelta(entry.scoreChange24h),
    },
  ];
  const usedMoverSlugs = new Set<string>();
  const notableMovers = notableMoverSpecs
    .map<NotableMover | null>((spec) => {
      const entry = spec.items.find((candidate) => {
        if (usedMoverSlugs.has(candidate.company.slug)) {
          return false;
        }

        usedMoverSlugs.add(candidate.company.slug);
        return true;
      });

      if (!entry) {
        return null;
      }

      return {
        id: spec.id,
        label: spec.label,
        direction: spec.direction,
        deltaLabel:
          spec.timeframe === "7d"
            ? spec.getDeltaLabel(entry)
            : `${spec.direction === "up" ? "▲" : "▼"} ${spec.getDeltaLabel(entry)}`,
        timeframe: spec.timeframe,
        entry,
      };
    })
    .filter((mover): mover is NotableMover => Boolean(mover))
    .slice(0, 3);

  if (rankedEntries.length === 0) {
    return (
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroMeta}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDotWrap}>
                <span className={styles.liveDot} />
              </span>
              Live Tracking
            </span>
          </div>
          <h1 className={styles.title}>Frontier Pulse Leaderboard</h1>
          <p className={styles.subtitle}>Leaderboard data is temporarily unavailable.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.gridOverlay} aria-hidden="true" />
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />
      <div className={styles.glowBottom} aria-hidden="true" />

      <section className={styles.hero}>
        <div className={styles.heroMeta}>
          <span className={styles.liveBadge}>
            <span className={styles.liveDotWrap}>
              <span className={styles.liveDot} />
            </span>
            Live Tracking
          </span>
          <span className={styles.refreshLabel}>Daily ranking surface</span>
        </div>

        <h1 className={styles.title}>Frontier Pulse Leaderboard</h1>
        <p className={styles.subtitle}>
          Mission control for the frontier AI race. This board refreshes from the latest momentum rankings and reorders the field through multiple competitive lenses.
        </p>

        <div className={styles.timestampRow}>
          <span className={styles.clockDot} />
          <span>{timestampCopy}</span>
          <span className={styles.timestampDivider}>/</span>
          <span>{FILTERS.find((filter) => filter.id === activeFilter)?.description}</span>
          <span className={styles.timestampDivider}>/</span>
          <span>Top {Math.min(10, rankedEntries.length)} of {allEntries.length} ranked companies</span>
        </div>
      </section>

      <section className={styles.comparisonSection}>
        <div className={styles.comparisonCard}>
          <div className={styles.comparisonHeader}>
            <div>
              <p className={styles.kicker}>Momentum History</p>
              <h2 className={styles.sectionTitle}>Overlay the board before the podium</h2>
              <p className={styles.comparisonDescription}>
                Compare the current leaders across logged daily score snapshots to see who is sustaining pressure versus drifting off the pace.
              </p>
              {comparisonHistory.rangeLabel ? (
                <p className={styles.comparisonRange}>Showing {comparisonHistory.rangeLabel}</p>
              ) : null}
              {comparisonHistory.isColdStart && comparisonHistory.historyStartLabel ? (
                <p className={styles.comparisonNote}>
                  History begins {comparisonHistory.historyStartLabel} — chart will populate as daily scores are logged.
                </p>
              ) : null}
            </div>

            <div className={styles.comparisonControls}>
              <span className={styles.comparisonMeta}>
                {comparisonEntries.length} leaders tracked{comparisonHistory.rangeLabel ? ` / ${comparisonHistory.rangeLabel}` : ""}
              </span>
              <div className={styles.windowToggle}>
                {[
                  { value: 7 as ChartWindow, label: "7d" },
                  { value: 30 as ChartWindow, label: "30d" },
                  { value: 90 as ChartWindow, label: "90d" },
                  { value: "all" as ChartWindow, label: "All" },
                ].map((windowSize) => (
                  <button
                    key={windowSize.label}
                    type="button"
                    className={cn(styles.windowButton, chartWindow === windowSize.value && styles.windowButtonActive)}
                    onClick={() => setChartWindow(windowSize.value)}
                  >
                    {windowSize.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.chartCanvas}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={comparisonSeries} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(139, 143, 168, 0.14)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--text-dim)"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={chartWindow === "all" || chartWindow === 90 ? 18 : chartWindow === 30 ? 14 : 8}
                    interval={chartWindow === "all" || chartWindow === 90 ? 6 : chartWindow === 30 ? 2 : 0}
                  />
                  <YAxis
                    stroke="var(--text-dim)"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    width={42}
                    tickFormatter={(value) => formatScore(Number(value))}
                  />
                  <Tooltip content={(props) => <HistoryTooltip {...props} />} cursor={{ stroke: "rgba(0, 229, 255, 0.18)", strokeDasharray: "4 4" }} />
                  {comparisonEntries.map((entry) => (
                    <Line
                      key={entry.company.slug}
                      type="stepAfter"
                      dataKey={entry.company.slug}
                      name={entry.company.name}
                      stroke={entry.lineColor}
                      strokeWidth={entry.displayRank <= 3 ? 2.4 : 1.9}
                      connectNulls={false}
                      dot={comparisonHistory.isColdStart ? { r: 3, strokeWidth: 0, fill: entry.lineColor } : false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: entry.lineColor }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.chartFallback} />
            )}
          </div>

          <div className={styles.chartLegend}>
            {comparisonEntries.map((entry) => (
              <span key={entry.company.slug} className={styles.chartLegendItem}>
                <span className={styles.chartLegendDot} style={{ backgroundColor: entry.lineColor }} />
                {entry.company.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.filterRail} aria-label="Leaderboard filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={cn(styles.filterButton, activeFilter === filter.id && styles.filterButtonActive)}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className={styles.podiumSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Top Podium</p>
          <h2 className={styles.sectionTitle}>Commanding the board right now</h2>
        </div>

        <div className={styles.podiumGrid}>
          {podiumEntries.map((entry, index) => {
            const tone = podiumTone(index);
            const DeltaIcon = getTrendIcon(entry.scoreChange24h);
            const sparkline = sparklinePath(entry.sparkline, 140, 50);
            const trendStroke =
              entry.sevenDayPercentTone === "up"
                ? "var(--green)"
                : entry.sevenDayPercentTone === "down"
                  ? "var(--red)"
                  : "var(--text-dim)";

            return (
              <article
                key={entry.company.slug}
                className={cn(
                  styles.podiumCard,
                  tone === "gold" && styles.podiumGold,
                  tone === "silver" && styles.podiumSilver,
                  tone === "bronze" && styles.podiumBronze,
                )}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className={styles.rankMedal}>{entry.displayRank}</div>
                <div className={styles.podiumHead}>
                  <CompanyLogo company={entry.company} className={cn(styles.podiumLogo, tone === "gold" && styles.podiumLogoLarge)} />
                  <div>
                    <p className={styles.companyName}>{entry.company.name}</p>
                    <p className={styles.companyTagline}>{entry.company.description}</p>
                  </div>
                </div>

                <div className={styles.scoreBlock}>
                  <div className={cn(styles.scoreValue, tone === "gold" && styles.scoreGold)}>{entry.score.toFixed(1)}</div>
                  <span className={cn(styles.deltaPill, entry.scoreChange24h >= 0 ? styles.deltaUp : styles.deltaDown)}>
                    <DeltaIcon className={styles.deltaIcon} />
                    {formatCompactDelta(entry.scoreChange24h)}
                  </span>
                </div>

                <svg viewBox="0 0 140 50" className={styles.podiumSparkline} aria-hidden="true">
                  {sparkline.points.length > 1 ? (
                    <>
                      <defs>
                        <linearGradient id={`podium-gradient-${entry.company.slug}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={trendStroke} stopOpacity="0.32" />
                          <stop offset="100%" stopColor={entry.sevenDayPercentTone === "down" ? "var(--magenta)" : "var(--cyan)"} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <path d={sparkline.fillPath} fill={`url(#podium-gradient-${entry.company.slug})`} />
                      <polyline
                        fill="none"
                        points={sparkline.polyline}
                        stroke={trendStroke}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : sparkline.points[0] ? (
                    <circle cx={sparkline.points[0].x} cy={sparkline.points[0].y} r="3.2" fill={trendStroke} />
                  ) : null}
                </svg>

                <div className={styles.metricRow}>
                  <div>
                    <p className={styles.metricLabel}>7d Trend</p>
                    <p
                      className={cn(
                        styles.metricValue,
                        entry.sevenDayPercentTone === "up"
                          ? styles.trendUp
                          : entry.sevenDayPercentTone === "down"
                            ? styles.trendDown
                            : styles.trendNeutral,
                      )}
                    >
                      {entry.sevenDayPercentLabel}
                    </p>
                  </div>
                  <div>
                    <p className={styles.metricLabel}>Key Driver</p>
                    <p className={styles.metricDriver}>{toCompleteSentence(entry.keyDriver)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.rankingsSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>{rankingsLabel}</p>
          <h2 className={styles.sectionTitle}>Depth chart across the frontier field</h2>
        </div>

        <div className={styles.tableShell}>
          <div className={styles.tableHead}>
            <span>#</span>
            <span>Company</span>
            <span>Score</span>
            <span>7d Trend</span>
            <span>Key Driver</span>
          </div>

          <div className={styles.tableBody}>
            {remainingEntries.map((entry, index) => {
              const TrendIcon = getTrendIcon(entry.sevenDayPercentValue);
              const sparkline = sparklinePath(entry.sparkline, 104, 30);
              const trendStroke =
                entry.sevenDayPercentTone === "up"
                  ? "var(--green)"
                  : entry.sevenDayPercentTone === "down"
                    ? "var(--red)"
                    : "var(--text-dim)";

              return (
                <button
                  key={entry.company.slug}
                  type="button"
                  className={styles.tableRow}
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                  onClick={() => router.push(`/companies/${entry.company.slug}`)}
                >
                  <span className={styles.rankCell}>{entry.displayRank.toString().padStart(2, "0")}</span>

                  <span className={styles.companyCell}>
                    <CompanyLogo company={entry.company} className={styles.rowLogo} imageClassName={styles.rowLogoImage} />
                    <span className={styles.companyMeta}>
                      <span className={styles.companyPrimary}>{entry.company.name}</span>
                    <span className={styles.companySecondary}>
                      {entry.activityCount > 0 ? `${entry.company.shortName} · ${entry.activityCount} recent moves` : entry.company.shortName}
                    </span>
                  </span>
                  </span>

                  <span className={styles.scoreCell}>
                    <span className={styles.scoreNumber}>{entry.score.toFixed(1)}</span>
                    <span className={cn(styles.scoreDelta, entry.scoreChange24h >= 0 ? styles.trendUp : styles.trendDown)}>
                      {formatCompactDelta(entry.scoreChange24h)}
                    </span>
                  </span>

                  <span className={styles.trendCell}>
                    <span
                      className={cn(
                        styles.trendBadge,
                        entry.sevenDayPercentTone === "up"
                          ? styles.deltaUp
                          : entry.sevenDayPercentTone === "down"
                            ? styles.deltaDown
                            : styles.deltaNeutral,
                      )}
                    >
                      <TrendIcon className={styles.deltaIcon} />
                      {entry.sevenDayPercentLabel}
                    </span>
                    <svg viewBox="0 0 104 30" className={styles.rowSparkline} aria-hidden="true">
                      {sparkline.points.length > 1 ? (
                        <polyline
                          fill="none"
                          points={sparkline.polyline}
                          stroke={trendStroke}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : sparkline.points[0] ? (
                        <circle cx={sparkline.points[0].x} cy={sparkline.points[0].y} r="2.8" fill={trendStroke} />
                      ) : null}
                    </svg>
                  </span>

                  <span className={styles.driverCell}>{entry.keyDriver}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {notableMovers.length > 0 ? (
        <section className={styles.insightsSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Notable Movers</p>
            <h2 className={styles.sectionTitle}>Where the ranking is moving fastest</h2>
          </div>

          <div className={styles.insightGrid}>
            {notableMovers.map((mover) => {
              const TrendIcon = getTrendIcon(mover.direction === "up" ? 1 : -1);

              return (
                <article key={mover.id} className={styles.insightCard}>
                  <div className={styles.insightLabel}>
                    <TrendIcon className={styles.insightIcon} />
                    {mover.label}
                  </div>
                  <div className={styles.moverHeader}>
                    <h3 className={styles.insightTitle}>{mover.entry.company.name}</h3>
                    <span
                      className={cn(
                        styles.deltaPill,
                        mover.direction === "up"
                          ? styles.deltaUp
                          : mover.direction === "down"
                            ? styles.deltaDown
                            : styles.deltaNeutral,
                      )}
                    >
                      {mover.deltaLabel}
                      <span className={styles.moverTimeframe}>{mover.timeframe}</span>
                    </span>
                  </div>
                  <p className={styles.insightBody}>{mover.entry.keyDriver}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.insightsSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Key Insights</p>
          <h2 className={styles.sectionTitle}>What the latest rankings are really saying</h2>
        </div>

        <div className={styles.insightGrid}>
          <article className={styles.insightCard}>
            <div className={styles.insightLabel}>
              <TrendingUp className={styles.insightIcon} />
              Biggest Mover
            </div>
            <h3 className={styles.insightTitle}>{biggestMover.company.name} is moving the board fastest</h3>
            <p className={styles.insightBody}>
              {biggestMover.company.name} has posted the strongest seven-day acceleration on the board at {biggestMover.sevenDayPercentLabel}.
            </p>
          </article>

          <article className={styles.insightCard}>
            <div className={styles.insightLabel}>
              <Sparkles className={styles.insightIcon} />
              Rising Star
            </div>
            <h3 className={styles.insightTitle}>{risingStar.company.name} is the pressure build to watch</h3>
            <p className={styles.insightBody}>
              Outside the podium, {risingStar.company.shortName} has the strongest seven-day move at {risingStar.sevenDayPercentLabel}.
            </p>
          </article>

          <article className={styles.insightCard}>
            <div className={styles.insightLabel}>
              <Radar className={styles.insightIcon} />
              Trend Alert
            </div>
            <h3 className={styles.insightTitle}>{trendAlertTitle}</h3>
            <p className={styles.insightBody}>{trendAlertBody}</p>
          </article>
        </div>
      </section>

      <div className={styles.footer}>
        Composite score based on benchmarks, shipping velocity, market traction &amp; research impact.
      </div>
    </div>
  );
}
