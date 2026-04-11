import { addDays, subDays } from "date-fns";

import type { CompanyRow, MomentumScoreHistoryRow, MomentumScoreRow } from "@/lib/db/types";
import scoreHistorySeedJson from "@/lib/seed/score-history.json";

export type HistoryWindow = 7 | 30 | 90 | "all";

export type ScoreHistoryPoint = {
  date: string;
  score: number;
};

export type DailyScoreEntry = {
  dateKey: string;
  companySlug: string;
  score: number;
  calculatedAt: string | null;
};

export type TrendPercentDelta = {
  status: "percent" | "new" | "na";
  value: number | null;
  baselineDate: string | null;
  baselineScore: number | null;
  currentDate: string | null;
  currentScore: number | null;
  windowDays: number;
};

type HistoryChartRow = {
  companySlug: string;
  history?: ScoreHistoryPoint[];
};

type HistoryBaseline = {
  baseline: ScoreHistoryPoint;
  current: ScoreHistoryPoint;
};

type ScoreHistorySeed = Record<string, Record<string, number>>;

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const scoreHistorySeed = scoreHistorySeedJson as ScoreHistorySeed;

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function compareEntries(left: DailyScoreEntry, right: DailyScoreEntry) {
  return (
    parseDateKey(left.dateKey).getTime() - parseDateKey(right.dateKey).getTime() ||
    left.companySlug.localeCompare(right.companySlug)
  );
}

function normalizePoints(points: ScoreHistoryPoint[]) {
  const latestByDate = new Map<string, ScoreHistoryPoint>();

  points.forEach((point) => {
    if (!isFiniteNumber(point.score)) {
      return;
    }

    latestByDate.set(point.date, {
      date: point.date,
      score: Number(point.score.toFixed(2)),
    });
  });

  return [...latestByDate.values()].sort((left, right) => parseDateKey(left.date).getTime() - parseDateKey(right.date).getTime());
}

export function toHistoryDateKey(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const parts = DATE_KEY_FORMATTER.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function formatHistoryDate(dateKey: string) {
  return LONG_DATE_FORMATTER.format(parseDateKey(dateKey));
}

export function formatHistoryAxisLabel(dateKey: string) {
  return SHORT_DATE_FORMATTER.format(parseDateKey(dateKey));
}

export function formatHistoryRange(dateKeys: string[]) {
  if (dateKeys.length === 0) {
    return null;
  }

  const first = dateKeys[0];
  const last = dateKeys[dateKeys.length - 1];

  if (first === last) {
    return formatHistoryDate(first);
  }

  return `${SHORT_DATE_FORMATTER.format(parseDateKey(first))} – ${LONG_DATE_FORMATTER.format(parseDateKey(last))}`;
}

export function uniqueSortedDateKeys(dateKeys: string[]) {
  return [...new Set(dateKeys)].sort((left, right) => parseDateKey(left).getTime() - parseDateKey(right).getTime());
}

export function buildDateRange(startDateKey: string, endDateKey: string) {
  const start = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
    return [];
  }

  const dates: string[] = [];
  let cursor = start;

  while (cursor.getTime() <= end.getTime()) {
    const dateKey = toHistoryDateKey(cursor);

    if (dateKey) {
      dates.push(dateKey);
    }

    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function getSeedScoreHistoryEntries() {
  return Object.entries(scoreHistorySeed)
    .flatMap(([dateKey, scores]) =>
      Object.entries(scores).map<DailyScoreEntry>(([companySlug, score]) => ({
        dateKey,
        companySlug,
        score: Number(score.toFixed(2)),
        calculatedAt: `${dateKey}T12:00:00.000Z`,
      })),
    )
    .sort(compareEntries);
}

export function buildDailyHistoryEntriesFromMomentumRows(
  companyRows: Array<Pick<CompanyRow, "id" | "slug">>,
  momentumRows: Array<Pick<MomentumScoreRow, "company_id" | "score" | "calculated_at">>,
) {
  const slugById = new Map(companyRows.map((row) => [row.id, row.slug]));
  const latestByCompanyDay = new Map<string, DailyScoreEntry>();

  momentumRows
    .slice()
    .sort((left, right) => new Date(left.calculated_at).getTime() - new Date(right.calculated_at).getTime())
    .forEach((row) => {
      const companySlug = slugById.get(row.company_id);
      const dateKey = toHistoryDateKey(row.calculated_at);

      if (!companySlug || !dateKey || !isFiniteNumber(Number(row.score))) {
        return;
      }

      latestByCompanyDay.set(`${companySlug}:${dateKey}`, {
        dateKey,
        companySlug,
        score: Number(Number(row.score).toFixed(2)),
        calculatedAt: row.calculated_at,
      });
    });

  return [...latestByCompanyDay.values()].sort(compareEntries);
}

export function buildDailyHistoryEntriesFromStoreRows(
  companyRows: Array<Pick<CompanyRow, "id" | "slug">>,
  historyRows: Array<Pick<MomentumScoreHistoryRow, "company_id" | "date_key" | "score" | "calculated_at">>,
) {
  const slugById = new Map(companyRows.map((row) => [row.id, row.slug]));

  return historyRows
    .map<DailyScoreEntry | null>((row) => {
      const companySlug = slugById.get(row.company_id);
      const dateKey = typeof row.date_key === "string" ? row.date_key : null;

      if (!companySlug || !dateKey || !isFiniteNumber(Number(row.score))) {
        return null;
      }

      return {
        dateKey,
        companySlug,
        score: Number(Number(row.score).toFixed(2)),
        calculatedAt: row.calculated_at,
      };
    })
    .filter((entry): entry is DailyScoreEntry => Boolean(entry))
    .sort(compareEntries);
}

export function mergeDailyScoreEntries(...groups: DailyScoreEntry[][]) {
  const merged = new Map<string, DailyScoreEntry>();

  groups.forEach((group) => {
    group.forEach((entry) => {
      merged.set(`${entry.companySlug}:${entry.dateKey}`, entry);
    });
  });

  return [...merged.values()].sort(compareEntries);
}

export function buildCompanyHistoryMap(entries: DailyScoreEntry[]) {
  const historyByCompany = new Map<string, ScoreHistoryPoint[]>();

  entries.forEach((entry) => {
    const current = historyByCompany.get(entry.companySlug) ?? [];
    current.push({
      date: entry.dateKey,
      score: entry.score,
    });
    historyByCompany.set(entry.companySlug, current);
  });

  return new Map(
    [...historyByCompany.entries()].map(([companySlug, points]) => [companySlug, normalizePoints(points)]),
  );
}

export function getHistoryWindowDateKeys(availableDateKeys: string[], window: HistoryWindow) {
  const sorted = uniqueSortedDateKeys(availableDateKeys);

  if (sorted.length === 0) {
    return [];
  }

  if (window === "all") {
    return buildDateRange(sorted[0], sorted[sorted.length - 1]);
  }

  const lastDate = parseDateKey(sorted[sorted.length - 1]);
  const desiredStart = subDays(lastDate, window);
  const earliestAvailable = parseDateKey(sorted[0]);
  const actualStart = earliestAvailable.getTime() > desiredStart.getTime() ? earliestAvailable : desiredStart;
  const startKey = toHistoryDateKey(actualStart);

  return startKey ? buildDateRange(startKey, sorted[sorted.length - 1]) : [];
}

export function buildSteppedHistory(points: ScoreHistoryPoint[], dateKeys: string[]) {
  const normalizedPoints = normalizePoints(points);
  const scoreByDate = new Map(normalizedPoints.map((point) => [point.date, point.score]));
  let previousScore: number | null = null;

  return dateKeys.map((dateKey) => {
    if (scoreByDate.has(dateKey)) {
      previousScore = scoreByDate.get(dateKey) ?? previousScore;
      return previousScore;
    }

    return previousScore;
  });
}

export function buildSparklineFromHistory(points: ScoreHistoryPoint[], window: Exclude<HistoryWindow, "all"> = 7) {
  const normalizedPoints = normalizePoints(points);
  const dateKeys = getHistoryWindowDateKeys(normalizedPoints.map((point) => point.date), window);
  return buildSteppedHistory(normalizedPoints, dateKeys).filter(isFiniteNumber);
}

export function resolveTrendBaseline(points: ScoreHistoryPoint[], windowDays = 7): HistoryBaseline | null {
  const normalizedPoints = normalizePoints(points);

  if (normalizedPoints.length < 2) {
    return null;
  }

  const current = normalizedPoints[normalizedPoints.length - 1];
  const targetDate = subDays(parseDateKey(current.date), windowDays);
  const baseline =
    normalizedPoints
      .slice()
      .reverse()
      .find((point) => parseDateKey(point.date).getTime() <= targetDate.getTime()) ?? normalizedPoints[0];

  if (!baseline || baseline.date === current.date) {
    return null;
  }

  return {
    baseline,
    current,
  };
}

export function calculateScoreChangeFromHistory(points: ScoreHistoryPoint[], windowDays = 7) {
  const baseline = resolveTrendBaseline(points, windowDays);

  if (!baseline) {
    return 0;
  }

  return Number((baseline.current.score - baseline.baseline.score).toFixed(2));
}

export function calculateTrendPercent(points: ScoreHistoryPoint[], windowDays = 7): TrendPercentDelta {
  const baseline = resolveTrendBaseline(points, windowDays);

  if (!baseline) {
    return {
      status: "na",
      value: null,
      baselineDate: null,
      baselineScore: null,
      currentDate: points.at(-1)?.date ?? null,
      currentScore: points.at(-1)?.score ?? null,
      windowDays,
    };
  }

  if (baseline.baseline.score === 0) {
    return {
      status: "new",
      value: null,
      baselineDate: baseline.baseline.date,
      baselineScore: baseline.baseline.score,
      currentDate: baseline.current.date,
      currentScore: baseline.current.score,
      windowDays,
    };
  }

  const value = ((baseline.current.score - baseline.baseline.score) / Math.abs(baseline.baseline.score)) * 100;

  return {
    status: "percent",
    value: Number(value.toFixed(1)),
    baselineDate: baseline.baseline.date,
    baselineScore: baseline.baseline.score,
    currentDate: baseline.current.date,
    currentScore: baseline.current.score,
    windowDays,
  };
}

export function formatTrendPercent(trend: TrendPercentDelta) {
  if (trend.status === "new") {
    return "NEW";
  }

  if (trend.status === "na" || !isFiniteNumber(trend.value)) {
    return "N/A";
  }

  return `${trend.value > 0 ? "+" : ""}${trend.value.toFixed(1)}%`;
}

export function getTrendPercentTone(trend: TrendPercentDelta) {
  if (trend.status !== "percent" || !isFiniteNumber(trend.value) || trend.value === 0) {
    return "neutral" as const;
  }

  return trend.value > 0 ? ("up" as const) : ("down" as const);
}

export function buildHistoryChartSeries(rows: HistoryChartRow[], window: HistoryWindow) {
  const availableDateKeys = uniqueSortedDateKeys(
    rows.flatMap((row) => (row.history ?? []).map((point) => point.date)),
  );
  const dateKeys = getHistoryWindowDateKeys(availableDateKeys, window);
  const steppedByCompany = new Map(
    rows.map((row) => [row.companySlug, buildSteppedHistory(row.history ?? [], dateKeys)]),
  );

  const series = dateKeys.map((dateKey, index) => {
    const point = {
      dateKey,
      label: formatHistoryAxisLabel(dateKey),
      fullLabel: formatHistoryDate(dateKey),
    } as Record<string, string | number | null>;

    rows.forEach((row) => {
      point[row.companySlug] = steppedByCompany.get(row.companySlug)?.[index] ?? null;
    });

    return point;
  });

  return {
    dateKeys,
    series,
    rangeLabel: formatHistoryRange(dateKeys),
    historyStartLabel: availableDateKeys[0] ? formatHistoryDate(availableDateKeys[0]) : null,
    isColdStart: availableDateKeys.length < 2,
  };
}
