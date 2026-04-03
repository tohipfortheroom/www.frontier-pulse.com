import type { ImpactDirection } from "@/lib/seed/data";

export type SourceKind = "rss" | "blog-scraper" | "manual";

export type ManualSourceItem = {
  title: string;
  url: string;
  publishedAt?: string;
  excerpt?: string;
};

export type SourceDefinition = {
  id: string;
  name: string;
  kind: SourceKind;
  url?: string;
  companyHint?: string;
  reliability: number;
  priority: number;
  items?: ManualSourceItem[];
};

export type RawIngestedItem = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
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
};

export type SummarizedCandidate = ScoredCandidate & {
  summary: string;
  shortSummary: string;
  whyItMatters: string;
};

export type PipelineRunResult = {
  sourceCount: number;
  fetchedCount: number;
  normalizedCount: number;
  storedCount: number;
  dryRun: boolean;
  errors: string[];
  items: SummarizedCandidate[];
};
