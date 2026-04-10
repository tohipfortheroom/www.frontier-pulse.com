import { differenceInHours } from "date-fns";

import type { CompanyCardRecord, SectionFreshness } from "@/lib/db/types";
import type { NewsItem } from "@/lib/seed/data";
import { hasMeaningfulMetric } from "@/lib/utils";

const CONTENT_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getContentDateKey(value: string | Date | null | undefined) {
  const parsed = value instanceof Date ? value : toTimestamp(value ?? null);

  if (!parsed) {
    return null;
  }

  const parts = CONTENT_DATE_FORMATTER.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function getLatestPublishedAt(items: Array<Pick<NewsItem, "publishedAt">>) {
  return items.reduce<string | null>((latest, item) => {
    if (!item.publishedAt) {
      return latest;
    }

    if (!latest) {
      return item.publishedAt;
    }

    return new Date(item.publishedAt).getTime() > new Date(latest).getTime() ? item.publishedAt : latest;
  }, null);
}

export function buildSectionFreshness({
  cacheKey,
  generatedAt,
  fetchedAt = generatedAt,
  newestContentAt,
  contentCount,
  expectedDateKey,
  staleAfterHours = 36,
  now = generatedAt,
}: {
  cacheKey: string;
  generatedAt: string;
  fetchedAt?: string;
  newestContentAt: string | null;
  contentCount: number;
  expectedDateKey?: string | null;
  staleAfterHours?: number;
  now?: string;
}): SectionFreshness {
  const newestContentDateKey = getContentDateKey(newestContentAt);

  if (!newestContentAt || contentCount === 0) {
    return {
      cacheKey,
      generatedAt,
      fetchedAt,
      newestContentAt,
      newestContentDateKey,
      expectedDateKey,
      contentCount,
      stale: true,
      status: "empty",
    };
  }

  const nowDate = toTimestamp(now);
  const newestDate = toTimestamp(newestContentAt);
  const isDateMismatch = Boolean(expectedDateKey && newestContentDateKey && newestContentDateKey !== expectedDateKey);
  const isAgeStale =
    nowDate && newestDate ? differenceInHours(nowDate, newestDate) > staleAfterHours : false;
  const stale = isDateMismatch || isAgeStale;

  return {
    cacheKey,
    generatedAt,
    fetchedAt,
    newestContentAt,
    newestContentDateKey,
    expectedDateKey,
    contentCount,
    stale,
    status: stale ? "stale" : "fresh",
  };
}

export function getCanonicalLeaderboardRecords(records: CompanyCardRecord[], limit?: number) {
  const sorted = records
    .filter(
      (record): record is CompanyCardRecord & { momentum: NonNullable<CompanyCardRecord["momentum"]> } =>
        Boolean(record.momentum && hasMeaningfulMetric(record.momentum.score)),
    )
    .sort((left, right) => left.momentum.rank - right.momentum.rank);

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getLeaderboardRangeLabel(visibleCount: number, podiumCount = 3) {
  if (visibleCount <= 0) {
    return "Full Rankings";
  }

  const start = podiumCount + 1;
  const end = podiumCount + visibleCount;

  return `Full Rankings · ${start}\u2013${end}`;
}

export function resolveDigestLeadStory(topStories: NewsItem[], mostImportantStory?: NewsItem | null) {
  const leadStory = mostImportantStory ?? topStories[0] ?? null;

  if (!leadStory) {
    return {
      leadStory: null,
      orderedStories: topStories,
    };
  }

  return {
    leadStory,
    orderedStories: [leadStory, ...topStories.filter((story) => story.slug !== leadStory.slug)],
  };
}
