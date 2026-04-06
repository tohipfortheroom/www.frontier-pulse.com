import type { SourceDefinition } from "./types.ts";

export const PIPELINE_NAME = "frontier-pulse-news";

export const PIPELINE_HEALTH_CONFIG = {
  liveWithinMinutes: 20,
  delayedAfterMinutes: 45,
  staleAfterMinutes: 120,
  quietFeedAfterMinutes: 180,
  sourceDegradedAfterMinutes: 90,
  sourceStaleAfterMinutes: 180,
  maxConsecutiveFailuresBeforeDegraded: 3,
} as const;

export const PIPELINE_RUNTIME_CONFIG = {
  fullRunCadenceMinutes: 10,
  priorityRunCadenceMinutes: 5,
  sourceConcurrency: 5,
  sitemapHydrationConcurrency: 4,
  requestTimeoutMs: 8_000,
  requestRetries: 2,
  runLockTtlSeconds: 14 * 60,
  maxSummariesPerRun: 30,
  nearDuplicateLookbackHours: 48,
} as const;

export const STORY_QUALITY_CONFIG = {
  officialMaxAgeHours: 7 * 24,
  communityMaxAgeHours: 3 * 24,
  manualMaxAgeHours: 14 * 24,
  maxFutureSkewMinutes: 30,
} as const;

export function getSourceMaxAgeHours(source: SourceDefinition) {
  if (typeof source.maxAgeHours === "number") {
    return source.maxAgeHours;
  }

  if (source.kind === "manual") {
    return STORY_QUALITY_CONFIG.manualMaxAgeHours;
  }

  if (source.priority <= 1) {
    return STORY_QUALITY_CONFIG.officialMaxAgeHours;
  }

  return STORY_QUALITY_CONFIG.communityMaxAgeHours;
}
