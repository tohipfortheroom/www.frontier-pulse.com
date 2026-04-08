import type { ImpactDirection } from "../seed/data.ts";
import type { SourceHealthStatus } from "./source-health.ts";

export type SourceKind = "rss" | "blog-scraper" | "manual" | "api";
export type SourceRunStatus = "success" | "partial_success" | "error" | "skipped";
export type PipelineRunStatus = "success" | "partial_success" | "error" | "skipped";
export type PipelineTriggerKind = "cron" | "priority-cron" | "manual" | "cli";
export type SourceTier = "official" | "major-media" | "trade-media" | "research-repository" | "community" | "manual";

export type ManualSourceItem = {
  title: string;
  url: string;
  publishedAt?: string;
  excerpt?: string;
};

export type ApiSourceConfig =
  | {
      provider: "hacker-news";
      query: string;
      hitsPerPage?: number;
    }
  | {
      provider: "reddit";
      subreddits: string[];
      timeframe?: "day" | "week" | "month" | "year";
      limit?: number;
    };

export type SourceDefinition = {
  id: string;
  name: string;
  kind: SourceKind;
  url?: string;
  companyHint?: string;
  companyHints?: string[];
  reliability: number;
  priority: number;
  fetchIntervalMinutes?: number;
  maxItems?: number;
  maxAgeHours?: number;
  requestTimeoutMs?: number;
  requestRetries?: number;
  itemUrlPrefixes?: string[];
  includeKeywords?: string[];
  items?: ManualSourceItem[];
  api?: ApiSourceConfig;
};

export type RawIngestedItem = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceReliability: number;
  sourcePriority: number;
  url: string;
  title: string;
  excerpt?: string;
  rawText?: string;
  publishedAt?: string;
  fetchedAt: string;
  companyHint?: string;
};

export type NormalizedCandidate = {
  headline: string;
  slug: string;
  sourceName: string;
  sourceUrl: string;
  sourceId: string;
  canonicalUrl: string;
  titleFingerprint: string;
  publishedAt: string;
  rawText: string | null;
  cleanedText: string | null;
  impactDirection: ImpactDirection;
  companySlugs: string[];
  categorySlugs: string[];
  tagSlugs: string[];
  significanceSignals: string[];
};

export type ScoredCandidate = NormalizedCandidate & {
  importanceScore: number;
  confidenceScore: number;
  sourceTier?: SourceTier;
  digestEligible?: boolean;
  whyItMattersEligible?: boolean;
  classificationConfidence?: number;
  reviewFlags?: string[];
};

export type SummarizedCandidate = ScoredCandidate & {
  summary: string;
  shortSummary: string;
  whyItMatters: string;
  summarizerModel?: string | null;
};

export type CandidateRejectionReason =
  | "missing-title"
  | "invalid-published-at"
  | "too-old"
  | "future-dated"
  | "duplicate-canonical"
  | "duplicate-title"
  | "duplicate-slug"
  | "editorial-suppressed";

export type CandidateRejection = {
  sourceId: string;
  headline: string;
  canonicalUrl: string;
  reason: CandidateRejectionReason;
};

export type SourceRunResult = {
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  priority: number;
  reliability: number;
  status: SourceRunStatus;
  attemptedAt: string;
  completedAt: string;
  durationMs: number;
  itemsFetched: number;
  acceptedCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicatesFiltered: number;
  invalidRejected: number;
  oldRejected: number;
  latestItemPublishedAt: string | null;
  error: string | null;
};

export type IngestionRunSummary = {
  runId: string;
  pipelineName: string;
  triggerKind: PipelineTriggerKind;
  targetScope: string;
  status: PipelineRunStatus;
  statusReason: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  sourceCount: number;
  sourceSuccessCount: number;
  sourceFailureCount: number;
  fetchedCount: number;
  normalizedCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicatesFiltered: number;
  invalidRejected: number;
  oldRejected: number;
  errorCount: number;
  dryRun: boolean;
};

export type PipelineRunResult = {
  runId: string;
  pipelineName: string;
  triggerKind: PipelineTriggerKind;
  targetScope: string;
  status: PipelineRunStatus;
  statusReason: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sourceCount: number;
  sourceSuccessCount: number;
  sourceFailureCount: number;
  fetchedCount: number;
  normalizedCount: number;
  insertedCount: number;
  updatedCount: number;
  storedCount: number;
  duplicatesFiltered: number;
  invalidRejected: number;
  oldRejected: number;
  dryRun: boolean;
  overlapPrevented: boolean;
  lastIngestionAt: string | null;
  errors: string[];
  items: SummarizedCandidate[];
  sourceStatuses: SourceHealthStatus[];
  staleSourceIds: string[];
  sources: SourceRunResult[];
  health: import("./source-health.ts").SourceHealthSnapshot;
};
