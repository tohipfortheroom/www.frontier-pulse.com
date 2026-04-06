import { getSupabaseReadClient, getSupabaseServiceClient, isSupabaseServiceConfigured } from "../db/client.ts";
import { logger } from "../monitoring/logger.ts";
import { sendBreakingNewsNotifications } from "../notifications/web-push.ts";
import {
  PIPELINE_NAME,
  PIPELINE_RUNTIME_CONFIG,
  getSourceMaxAgeHours,
} from "./config.ts";
import { mapWithConcurrency } from "./async.ts";
import { normalizeIngestedItem } from "./normalizer.ts";
import { classifyStoryAge, normalizePublishedAt } from "./quality.ts";
import { beginPipelineRun, completePipelineRun, recordSourceRun } from "./run-state.ts";
import { scoreCandidate } from "./scorer.ts";
import { getSourceHealthRowMap, getSourceHealthSnapshot, upsertSourceHealth } from "./source-health.ts";
import { resetSummarizerRunState, summarizeCandidate } from "./summarizer.ts";
import { ingest as ingestApi } from "./sources/api.ts";
import { ingest as ingestBlog } from "./sources/blog-scraper.ts";
import { ingest as ingestManual } from "./sources/manual.ts";
import { ingest as ingestRss } from "./sources/rss.ts";
import type {
  CandidateRejection,
  PipelineRunResult,
  PipelineTriggerKind,
  RawIngestedItem,
  SourceDefinition,
  SourceRunResult,
  SummarizedCandidate,
} from "./types.ts";

const metaAiFeedKeywords = [
  "meta ai",
  "artificial intelligence",
  "generative ai",
  "llama",
  "executorch",
  "mtia",
  "segment anything",
  "dino",
  "risk review",
  "data center silicon",
];

const nvidiaAiFeedKeywords = [
  "ai",
  "artificial intelligence",
  "blackwell",
  "dgx",
  "nim",
  "inference",
  "training",
  "data center",
  "robotics",
  "foundation model",
];

const configuredSourceAllowlist = (process.env.SOURCE_ALLOWLIST ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const sourceRegistryBase: SourceDefinition[] = [
  {
    id: "openai-news",
    name: "OpenAI News",
    kind: "rss",
    url: "https://openai.com/news/rss.xml",
    companyHint: "openai",
    companyHints: ["openai"],
    reliability: 0.98,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "anthropic-newsroom",
    name: "Anthropic Newsroom",
    kind: "rss",
    url: "https://www.anthropic.com/sitemap.xml",
    companyHint: "anthropic",
    companyHints: ["anthropic"],
    reliability: 0.96,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 10,
    itemUrlPrefixes: ["https://www.anthropic.com/news/"],
  },
  {
    id: "google-deepmind-blog",
    name: "Google DeepMind Blog",
    kind: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    companyHint: "google-deepmind",
    companyHints: ["google-deepmind"],
    reliability: 0.97,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "meta-ai-news",
    name: "Meta AI News",
    kind: "rss",
    url: "https://about.fb.com/news/feed/",
    companyHint: "meta-ai",
    companyHints: ["meta-ai"],
    reliability: 0.92,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
    includeKeywords: metaAiFeedKeywords,
  },
  {
    id: "microsoft-ai-news",
    name: "Microsoft AI News",
    kind: "rss",
    url: "https://news.microsoft.com/source/topics/ai/feed/",
    companyHint: "microsoft-ai",
    companyHints: ["microsoft-ai"],
    reliability: 0.96,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "mistral-news",
    name: "Mistral News",
    kind: "rss",
    url: "https://mistral.ai/sitemap.xml",
    companyHint: "mistral",
    companyHints: ["mistral"],
    reliability: 0.95,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 10,
    itemUrlPrefixes: ["https://mistral.ai/news/"],
  },
  {
    id: "nvidia-blog",
    name: "NVIDIA Blog",
    kind: "rss",
    url: "https://blogs.nvidia.com/feed/",
    companyHint: "nvidia",
    companyHints: ["nvidia"],
    reliability: 0.94,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
    includeKeywords: nvidiaAiFeedKeywords,
  },
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    kind: "rss",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    reliability: 0.86,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "verge-ai",
    name: "The Verge AI",
    kind: "rss",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    reliability: 0.85,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "ars-ai",
    name: "Ars Technica AI",
    kind: "rss",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    reliability: 0.83,
    priority: 3,
    fetchIntervalMinutes: 20,
    maxItems: 10,
    includeKeywords: ["ai", "artificial intelligence", "model", "llm", "inference", "agent"],
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    kind: "rss",
    url: "https://venturebeat.com/category/ai/feed/",
    reliability: 0.84,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "mit-tech-review-ai",
    name: "MIT Technology Review AI",
    kind: "rss",
    url: "https://www.technologyreview.com/feed/",
    reliability: 0.84,
    priority: 3,
    fetchIntervalMinutes: 30,
    maxItems: 10,
    includeKeywords: ["ai", "artificial intelligence", "model", "openai", "anthropic", "google", "meta"],
  },
  {
    id: "arxiv-cs-ai",
    name: "arXiv cs.AI",
    kind: "rss",
    url: "http://export.arxiv.org/rss/cs.AI",
    reliability: 0.78,
    priority: 4,
    fetchIntervalMinutes: 60,
    maxItems: 10,
    includeKeywords: ["openai", "google", "deepmind", "meta", "microsoft", "anthropic", "nvidia", "mistral"],
  },
  {
    id: "hacker-news-ai",
    name: "Hacker News AI",
    kind: "api",
    url: "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=30",
    reliability: 0.7,
    priority: 2,
    fetchIntervalMinutes: 15,
    maxItems: 15,
    maxAgeHours: 48,
    api: {
      provider: "hacker-news",
      query: "AI",
      hitsPerPage: 30,
    },
  },
  {
    id: "reddit-ai-communities",
    name: "Reddit AI Communities",
    kind: "api",
    reliability: 0.65,
    priority: 2,
    fetchIntervalMinutes: 20,
    maxItems: 16,
    maxAgeHours: 36,
    api: {
      provider: "reddit",
      subreddits: ["MachineLearning", "artificial"],
      timeframe: "day",
      limit: 20,
    },
  },
  {
    id: "apple-ml-research",
    name: "Apple ML Research",
    kind: "rss",
    url: "https://machinelearning.apple.com/rss.xml",
    companyHint: "apple-ai",
    companyHints: ["apple-ai"],
    reliability: 0.93,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 10,
  },
  {
    id: "hugging-face-blog",
    name: "Hugging Face Blog",
    kind: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    companyHint: "hugging-face",
    companyHints: ["hugging-face"],
    reliability: 0.90,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 12,
  },
  {
    id: "stability-ai-news",
    name: "Stability AI News",
    kind: "rss",
    url: "https://stability.ai/sitemap.xml",
    companyHint: "stability-ai",
    companyHints: ["stability-ai"],
    reliability: 0.88,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 10,
    itemUrlPrefixes: ["https://stability.ai/news-updates/"],
  },
  {
    id: "cohere-blog",
    name: "Cohere Blog",
    kind: "rss",
    url: "https://cohere.com/sitemap.xml",
    companyHint: "cohere",
    companyHints: ["cohere"],
    reliability: 0.88,
    priority: 1,
    fetchIntervalMinutes: 10,
    maxItems: 10,
    itemUrlPrefixes: ["https://cohere.com/blog/"],
  },
  {
    id: "together-ai-blog",
    name: "Together AI Blog",
    kind: "rss",
    url: "https://www.together.ai/sitemap.xml",
    companyHint: "together-ai",
    companyHints: ["together-ai"],
    reliability: 0.85,
    priority: 2,
    fetchIntervalMinutes: 15,
    maxItems: 10,
    itemUrlPrefixes: ["https://www.together.ai/blog/"],
  },
  {
    id: "the-information-ai",
    name: "The Information AI",
    kind: "rss",
    url: "https://www.theinformation.com/feed",
    reliability: 0.88,
    priority: 2,
    fetchIntervalMinutes: 15,
    maxItems: 10,
    includeKeywords: ["ai", "artificial intelligence", "openai", "anthropic", "google", "meta", "microsoft", "model", "gpu", "chips"],
  },
  {
    id: "wired-ai",
    name: "Wired AI",
    kind: "rss",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    reliability: 0.80,
    priority: 2,
    fetchIntervalMinutes: 15,
    maxItems: 10,
  },
  {
    id: "reuters-tech",
    name: "Reuters Technology",
    kind: "rss",
    url: "https://www.reuters.com/technology/rss",
    reliability: 0.80,
    priority: 2,
    fetchIntervalMinutes: 15,
    maxItems: 10,
    includeKeywords: ["ai", "artificial intelligence", "openai", "anthropic", "google", "meta", "microsoft", "nvidia", "chip"],
  },
  {
    id: "manual-watchlist",
    name: "Manual Watchlist",
    kind: "manual",
    reliability: 0.6,
    priority: 3,
    fetchIntervalMinutes: 60,
    items: [],
  },
];

export const sourceRegistry: SourceDefinition[] =
  configuredSourceAllowlist.length > 0
    ? sourceRegistryBase.filter((source) => configuredSourceAllowlist.includes(source.id))
    : sourceRegistryBase;

type ExistingNewsLookupRow = {
  id: string;
  slug: string;
  canonical_url: string | null;
  title_fingerprint: string | null;
  summary: string;
  short_summary: string;
  why_it_matters: string;
  summarizer_model: string | null;
  published_at: string;
};

type SourceAttempt = {
  source: SourceDefinition;
  attemptedAt: string;
  completedAt: string;
  durationMs: number;
  items: RawIngestedItem[];
  error: string | null;
};

type CandidateEnvelope = {
  source: SourceDefinition;
  rawItem: RawIngestedItem;
  candidate: ReturnType<typeof scoreCandidate> & NonNullable<ReturnType<typeof normalizeIngestedItem>>;
};

type SourceCounters = {
  source: SourceDefinition;
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
  lastNewItemAt: string | null;
  error: string | null;
};

type RunIngestionOptions = {
  selectedSourceIds?: string[];
  triggerKind?: PipelineTriggerKind;
  targetScope?: string;
  resummarize?: boolean;
  maxAgeOverrideHours?: number;
};

function logIngestionEvent(event: string, details: Record<string, unknown>) {
  logger.info("ingestion", event, {
    pipeline: PIPELINE_NAME,
    ...details,
  });
}

function createSourceCounters(attempt: SourceAttempt): SourceCounters {
  return {
    source: attempt.source,
    attemptedAt: attempt.attemptedAt,
    completedAt: attempt.completedAt,
    durationMs: attempt.durationMs,
    itemsFetched: attempt.items.length,
    acceptedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    duplicatesFiltered: 0,
    invalidRejected: 0,
    oldRejected: 0,
    latestItemPublishedAt: null,
    lastNewItemAt: null,
    error: attempt.error,
  };
}

function buildSourceRunResult(counters: SourceCounters): SourceRunResult {
  return {
    sourceId: counters.source.id,
    sourceName: counters.source.name,
    sourceKind: counters.source.kind,
    priority: counters.source.priority,
    reliability: counters.source.reliability,
    status: counters.error ? "error" : "success",
    attemptedAt: counters.attemptedAt,
    completedAt: counters.completedAt,
    durationMs: counters.durationMs,
    itemsFetched: counters.itemsFetched,
    acceptedCount: counters.acceptedCount,
    insertedCount: counters.insertedCount,
    updatedCount: counters.updatedCount,
    duplicatesFiltered: counters.duplicatesFiltered,
    invalidRejected: counters.invalidRejected,
    oldRejected: counters.oldRejected,
    latestItemPublishedAt: counters.latestItemPublishedAt,
    error: counters.error,
  };
}

function buildExistingSummaryMap(rows: ExistingNewsLookupRow[]) {
  const summaryByCanonical = new Map<
    string,
    { summary: string; shortSummary: string; whyItMatters: string; summarizerModel: string | null }
  >();
  const summaryByFingerprint = new Map<
    string,
    { summary: string; shortSummary: string; whyItMatters: string; summarizerModel: string | null }
  >();

  rows.forEach((row) => {
    const summary = {
      summary: row.summary,
      shortSummary: row.short_summary,
      whyItMatters: row.why_it_matters,
      summarizerModel: row.summarizer_model,
    };

    if (row.canonical_url) {
      summaryByCanonical.set(row.canonical_url, summary);
    }

    if (row.title_fingerprint) {
      summaryByFingerprint.set(row.title_fingerprint, summary);
    }
  });

  return { summaryByCanonical, summaryByFingerprint };
}

async function ingestSource(source: SourceDefinition) {
  switch (source.kind) {
    case "api":
      return ingestApi(source);
    case "rss":
      return ingestRss(source);
    case "blog-scraper":
      return ingestBlog(source);
    case "manual":
      return ingestManual(source);
    default:
      return [];
  }
}

async function attemptSourceIngestion(source: SourceDefinition): Promise<SourceAttempt> {
  const attemptedAt = new Date().toISOString();
  const started = Date.now();

  try {
    const items = await ingestSource(source);
    const completedAt = new Date().toISOString();
    logIngestionEvent("source_completed", {
      sourceId: source.id,
      durationMs: Date.now() - started,
      itemsFetched: items.length,
      maxAgeHours: getSourceMaxAgeHours(source),
    });

    return {
      source,
      attemptedAt,
      completedAt,
      durationMs: Date.now() - started,
      items,
      error: null,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    logIngestionEvent("source_failed", {
      sourceId: source.id,
      durationMs: Date.now() - started,
      error: message,
    });

    return {
      source,
      attemptedAt,
      completedAt,
      durationMs: Date.now() - started,
      items: [],
      error: message,
    };
  }
}

async function getExistingNewsLookups(candidates: CandidateEnvelope[]) {
  const client = getSupabaseReadClient();

  if (!client || candidates.length === 0) {
    return {
      bySlug: new Map<string, ExistingNewsLookupRow>(),
      byCanonicalUrl: new Map<string, ExistingNewsLookupRow>(),
      byTitleFingerprint: new Map<string, ExistingNewsLookupRow>(),
    };
  }

  const slugs = Array.from(new Set(candidates.map((entry) => entry.candidate.slug)));
  const canonicalUrls = Array.from(
    new Set(candidates.map((entry) => entry.candidate.canonicalUrl).filter(Boolean)),
  );
  const titleFingerprints = Array.from(
    new Set(candidates.map((entry) => entry.candidate.titleFingerprint).filter(Boolean)),
  );
  const lookbackThreshold = new Date(
    Date.now() - PIPELINE_RUNTIME_CONFIG.nearDuplicateLookbackHours * 60 * 60 * 1000,
  ).toISOString();

  const [slugResult, canonicalResult, fingerprintResult] = await Promise.all([
    slugs.length > 0
      ? client
          .from("news_items")
          .select("id, slug, canonical_url, title_fingerprint, summary, short_summary, why_it_matters, summarizer_model, published_at")
          .in("slug", slugs)
      : Promise.resolve({ data: [], error: null }),
    canonicalUrls.length > 0
      ? client
          .from("news_items")
          .select("id, slug, canonical_url, title_fingerprint, summary, short_summary, why_it_matters, summarizer_model, published_at")
          .in("canonical_url", canonicalUrls)
      : Promise.resolve({ data: [], error: null }),
    titleFingerprints.length > 0
      ? client
          .from("news_items")
          .select("id, slug, canonical_url, title_fingerprint, summary, short_summary, why_it_matters, summarizer_model, published_at")
          .in("title_fingerprint", titleFingerprints)
          .gte("published_at", lookbackThreshold)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const allRows = [
    ...((slugResult.data ?? []) as ExistingNewsLookupRow[]),
    ...((canonicalResult.data ?? []) as ExistingNewsLookupRow[]),
    ...((fingerprintResult.data ?? []) as ExistingNewsLookupRow[]),
  ];
  const deduped = new Map<string, ExistingNewsLookupRow>();

  allRows.forEach((row) => {
    deduped.set(row.id, row);
  });

  const rows = [...deduped.values()];

  return {
    bySlug: new Map(rows.map((row) => [row.slug, row])),
    byCanonicalUrl: new Map(
      rows
        .filter((row) => row.canonical_url)
        .map((row) => [row.canonical_url as string, row]),
    ),
    byTitleFingerprint: new Map(
      rows
        .filter((row) => row.title_fingerprint)
        .map((row) => [row.title_fingerprint as string, row]),
    ),
  };
}

async function touchExistingStories(storyIds: string[]) {
  const client = getSupabaseServiceClient();

  if (!client || storyIds.length === 0) {
    return {
      dryRun: !client,
      updatedCount: 0,
    };
  }

  const nowIso = new Date().toISOString();
  const uniqueIds = Array.from(new Set(storyIds));
  const { error } = await client
    .from("news_items")
    .update({ last_seen_at: nowIso })
    .in("id", uniqueIds);

  if (error) {
    throw error;
  }

  return {
    dryRun: false,
    updatedCount: uniqueIds.length,
  };
}

async function storeNewCandidates(candidates: SummarizedCandidate[]) {
  const client = getSupabaseServiceClient();

  if (!client) {
    return {
      dryRun: true,
      insertedCount: 0,
      insertedRows: [] as Array<{ id: string; slug: string }>,
    };
  }

  if (candidates.length === 0) {
    return {
      dryRun: false,
      insertedCount: 0,
      insertedRows: [] as Array<{ id: string; slug: string }>,
    };
  }

  const [companiesResult, categoriesResult, tagsResult] = await Promise.all([
    client.from("companies").select("id, slug"),
    client.from("categories").select("id, slug"),
    client.from("tags").select("id, slug"),
  ]);

  if (companiesResult.error || categoriesResult.error || tagsResult.error) {
    throw companiesResult.error ?? categoriesResult.error ?? tagsResult.error;
  }

  const companyIdBySlug = Object.fromEntries((companiesResult.data ?? []).map((row) => [row.slug, row.id]));
  const categoryIdBySlug = Object.fromEntries((categoriesResult.data ?? []).map((row) => [row.slug, row.id]));
  const tagIdBySlug = Object.fromEntries((tagsResult.data ?? []).map((row) => [row.slug, row.id]));
  const nowIso = new Date().toISOString();

  const newsPayload = candidates.map((candidate) => ({
    headline: candidate.headline,
    slug: candidate.slug,
    source_name: candidate.sourceName,
    source_url: candidate.canonicalUrl,
    canonical_url: candidate.canonicalUrl,
    title_fingerprint: candidate.titleFingerprint,
    published_at: candidate.publishedAt,
    ingested_at: nowIso,
    last_seen_at: nowIso,
    raw_text: candidate.rawText,
    cleaned_text: candidate.cleanedText,
    summary: candidate.summary,
    short_summary: candidate.shortSummary,
    why_it_matters: candidate.whyItMatters,
    summarizer_model: candidate.summarizerModel ?? null,
    importance_score: candidate.importanceScore,
    confidence_score: candidate.confidenceScore,
    impact_direction: candidate.impactDirection,
  }));

  const { data: insertedNews, error: newsError } = await client
    .from("news_items")
    .upsert(newsPayload, { onConflict: "slug" })
    .select("id, slug");

  if (newsError || !insertedNews) {
    const message =
      newsError && typeof newsError === "object" && "message" in newsError && typeof newsError.message === "string"
        ? newsError.message
        : "Unable to store ingested news items.";
    throw new Error(message);
  }

  const newsIdBySlug = Object.fromEntries(insertedNews.map((row) => [row.slug, row.id]));

  const companyNewsPayload = candidates.flatMap((candidate) =>
    candidate.companySlugs
      .filter((slug) => companyIdBySlug[slug] && newsIdBySlug[candidate.slug])
      .map((slug) => ({
        company_id: companyIdBySlug[slug],
        news_item_id: newsIdBySlug[candidate.slug],
      })),
  );

  const categoryPayload = candidates.flatMap((candidate) =>
    candidate.categorySlugs
      .filter((slug) => categoryIdBySlug[slug] && newsIdBySlug[candidate.slug])
      .map((slug) => ({
        news_item_id: newsIdBySlug[candidate.slug],
        category_id: categoryIdBySlug[slug],
      })),
  );

  const tagPayload = candidates.flatMap((candidate) =>
    candidate.tagSlugs
      .filter((slug) => tagIdBySlug[slug] && newsIdBySlug[candidate.slug])
      .map((slug) => ({
        news_item_id: newsIdBySlug[candidate.slug],
        tag_id: tagIdBySlug[slug],
      })),
  );

  const [companyNewsResult, categoryResult, tagResult] = await Promise.all([
    companyNewsPayload.length > 0
      ? client.from("company_news").upsert(companyNewsPayload, { onConflict: "company_id,news_item_id" })
      : Promise.resolve({ error: null }),
    categoryPayload.length > 0
      ? client.from("news_item_categories").upsert(categoryPayload, { onConflict: "news_item_id,category_id" })
      : Promise.resolve({ error: null }),
    tagPayload.length > 0
      ? client.from("news_item_tags").upsert(tagPayload, { onConflict: "news_item_id,tag_id" })
      : Promise.resolve({ error: null }),
  ]);

  if (companyNewsResult.error || categoryResult.error || tagResult.error) {
    throw companyNewsResult.error ?? categoryResult.error ?? tagResult.error;
  }

  return {
    dryRun: false,
    insertedCount: insertedNews.length,
    insertedRows: insertedNews,
  };
}

async function updateExistingCandidates(
  candidates: Array<{
    existingId: string;
    sourceId: string;
    candidate: SummarizedCandidate;
  }>,
) {
  const client = getSupabaseServiceClient();

  if (!client || candidates.length === 0) {
    return {
      dryRun: !client,
      updatedCount: 0,
    };
  }

  const nowIso = new Date().toISOString();

  for (const { existingId, candidate } of candidates) {
    const { error } = await client
      .from("news_items")
      .update({
        source_name: candidate.sourceName,
        source_url: candidate.canonicalUrl,
        canonical_url: candidate.canonicalUrl,
        title_fingerprint: candidate.titleFingerprint,
        published_at: candidate.publishedAt,
        ingested_at: nowIso,
        last_seen_at: nowIso,
        raw_text: candidate.rawText,
        cleaned_text: candidate.cleanedText,
        summary: candidate.summary,
        short_summary: candidate.shortSummary,
        why_it_matters: candidate.whyItMatters,
        summarizer_model: candidate.summarizerModel ?? null,
        importance_score: candidate.importanceScore,
        confidence_score: candidate.confidenceScore,
        impact_direction: candidate.impactDirection,
      })
      .eq("id", existingId);

    if (error) {
      throw error;
    }
  }

  return {
    dryRun: false,
    updatedCount: candidates.length,
  };
}

export async function runIngestionPipeline(options: RunIngestionOptions = {}): Promise<PipelineRunResult> {
  resetSummarizerRunState();

  const selectedSourceIds = options.selectedSourceIds ?? sourceRegistry.map((source) => source.id);
  const selectedSources = sourceRegistry.filter((source) => selectedSourceIds.includes(source.id));
  const triggerKind = options.triggerKind ?? "manual";
  const targetScope = options.targetScope ?? (selectedSources.length === sourceRegistry.length ? "all" : "selected");
  const forceResummarize = options.resummarize ?? false;
  const maxAgeOverrideHours = options.maxAgeOverrideHours;
  const runContext = await beginPipelineRun({
    triggerKind,
    targetScope,
    sourceCount: selectedSources.length,
    dryRun: !isSupabaseServiceConfigured(),
  });
  const errors: string[] = [];
  const sourceHealthRows = await getSourceHealthRowMap();

  logIngestionEvent("run_started", {
    runId: runContext.runId,
    triggerKind,
    targetScope,
    sourceCount: selectedSources.length,
    dryRun: runContext.dryRun,
    overlapPrevented: runContext.overlapPrevented,
  });

  if (!runContext.lockAcquired) {
    const healthSnapshot = await getSourceHealthSnapshot(sourceRegistry);

    return {
      runId: runContext.runId,
      pipelineName: PIPELINE_NAME,
      triggerKind,
      targetScope,
      status: "skipped",
      statusReason: "Another ingestion run is already in progress.",
      startedAt: runContext.startedAt,
      completedAt: runContext.startedAt,
      durationMs: 0,
      sourceCount: selectedSources.length,
      sourceSuccessCount: 0,
      sourceFailureCount: 0,
      fetchedCount: 0,
      normalizedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      storedCount: 0,
      duplicatesFiltered: 0,
      invalidRejected: 0,
      oldRejected: 0,
      dryRun: runContext.dryRun,
      overlapPrevented: true,
      lastIngestionAt: healthSnapshot.lastIngestionAt,
      errors: ["Another ingestion run is already in progress."],
      items: [],
      sourceStatuses: healthSnapshot.sources,
      staleSourceIds: healthSnapshot.sources.filter((source) => source.stale).map((source) => source.sourceId),
      sources: [],
      health: healthSnapshot,
    };
  }

  const sourceAttempts = await mapWithConcurrency(
    selectedSources,
    PIPELINE_RUNTIME_CONFIG.sourceConcurrency,
    async (source) => attemptSourceIngestion(source),
  );
  const sourceCounters = new Map<string, SourceCounters>(
    sourceAttempts.map((attempt) => [attempt.source.id, createSourceCounters(attempt)]),
  );
  const candidateEnvelopes: CandidateEnvelope[] = [];
  const rejections: CandidateRejection[] = [];
  const runSeenCanonicalUrls = new Set<string>();
  const runSeenTitleFingerprints = new Set<string>();
  const runSeenSlugs = new Set<string>();

  sourceAttempts.forEach((attempt) => {
    const counters = sourceCounters.get(attempt.source.id);

    if (!counters) {
      return;
    }

    if (attempt.error) {
      errors.push(`${attempt.source.id}: ${attempt.error}`);
      return;
    }

    for (const rawItem of attempt.items) {
      if (!rawItem.title?.trim()) {
        counters.invalidRejected += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: rawItem.title ?? "",
          canonicalUrl: rawItem.url,
          reason: "missing-title",
        });
        continue;
      }

      const publishedAt = normalizePublishedAt(rawItem.publishedAt, rawItem.fetchedAt);

      if (!publishedAt) {
        counters.invalidRejected += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: rawItem.title,
          canonicalUrl: rawItem.url,
          reason: "invalid-published-at",
        });
        continue;
      }

      const ageClassification = classifyStoryAge(publishedAt, attempt.source, new Date(), maxAgeOverrideHours);

      if (ageClassification === "future") {
        counters.invalidRejected += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: rawItem.title,
          canonicalUrl: rawItem.url,
          reason: "future-dated",
        });
        continue;
      }

      if (ageClassification === "too-old") {
        counters.oldRejected += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: rawItem.title,
          canonicalUrl: rawItem.url,
          reason: "too-old",
        });
        continue;
      }

      const normalizedCandidate = normalizeIngestedItem({
        ...rawItem,
        publishedAt,
      });

      if (!normalizedCandidate) {
        counters.invalidRejected += 1;
        continue;
      }

      counters.acceptedCount += 1;
      counters.latestItemPublishedAt =
        counters.latestItemPublishedAt && new Date(counters.latestItemPublishedAt) > new Date(normalizedCandidate.publishedAt)
          ? counters.latestItemPublishedAt
          : normalizedCandidate.publishedAt;

      if (runSeenCanonicalUrls.has(normalizedCandidate.canonicalUrl)) {
        counters.duplicatesFiltered += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: normalizedCandidate.headline,
          canonicalUrl: normalizedCandidate.canonicalUrl,
          reason: "duplicate-canonical",
        });
        continue;
      }

      if (runSeenTitleFingerprints.has(normalizedCandidate.titleFingerprint)) {
        counters.duplicatesFiltered += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: normalizedCandidate.headline,
          canonicalUrl: normalizedCandidate.canonicalUrl,
          reason: "duplicate-title",
        });
        continue;
      }

      if (runSeenSlugs.has(normalizedCandidate.slug)) {
        counters.duplicatesFiltered += 1;
        rejections.push({
          sourceId: attempt.source.id,
          headline: normalizedCandidate.headline,
          canonicalUrl: normalizedCandidate.canonicalUrl,
          reason: "duplicate-slug",
        });
        continue;
      }

      runSeenCanonicalUrls.add(normalizedCandidate.canonicalUrl);
      runSeenTitleFingerprints.add(normalizedCandidate.titleFingerprint);
      runSeenSlugs.add(normalizedCandidate.slug);
      candidateEnvelopes.push({
        source: attempt.source,
        rawItem,
        candidate: {
          ...normalizedCandidate,
          ...scoreCandidate(normalizedCandidate, rawItem),
        },
      });
    }
  });

  const existingLookups = await getExistingNewsLookups(candidateEnvelopes);
  const existingSummaryMaps = buildExistingSummaryMap([
    ...existingLookups.bySlug.values(),
    ...existingLookups.byCanonicalUrl.values(),
    ...existingLookups.byTitleFingerprint.values(),
  ]);

  const candidatesToInsert: CandidateEnvelope[] = [];
  const candidatesToRefresh: Array<{
    sourceId: string;
    existingId: string;
    candidate: CandidateEnvelope["candidate"];
  }> = [];
  const existingStoryIdsToTouch: string[] = [];
  const existingStoryIdsBySource = new Map<string, string[]>();

  candidateEnvelopes.forEach((entry) => {
    const counters = sourceCounters.get(entry.source.id);

    if (!counters) {
      return;
    }

    const existingMatch =
      existingLookups.byCanonicalUrl.get(entry.candidate.canonicalUrl) ??
      existingLookups.bySlug.get(entry.candidate.slug) ??
      existingLookups.byTitleFingerprint.get(entry.candidate.titleFingerprint);

    if (existingMatch) {
      if (forceResummarize) {
        candidatesToRefresh.push({
          sourceId: entry.source.id,
          existingId: existingMatch.id,
          candidate: entry.candidate,
        });
      } else {
        counters.duplicatesFiltered += 1;
        existingStoryIdsToTouch.push(existingMatch.id);
        existingStoryIdsBySource.set(entry.source.id, [
          ...(existingStoryIdsBySource.get(entry.source.id) ?? []),
          existingMatch.id,
        ]);
      }
      return;
    }

    candidatesToInsert.push(entry);
  });

  const summarized: SummarizedCandidate[] = [];

  for (const entry of candidatesToInsert) {
    const existingSummary =
      existingSummaryMaps.summaryByCanonical.get(entry.candidate.canonicalUrl) ??
      existingSummaryMaps.summaryByFingerprint.get(entry.candidate.titleFingerprint) ??
      null;

    const summary = await summarizeCandidate(entry.candidate, {
      existingSummary,
    });

    summarized.push({
      ...entry.candidate,
      ...summary,
    });
  }

  const refreshedCandidates: Array<{
    sourceId: string;
    existingId: string;
    candidate: SummarizedCandidate;
  }> = [];

  for (const entry of candidatesToRefresh) {
    const existingSummary =
      existingSummaryMaps.summaryByCanonical.get(entry.candidate.canonicalUrl) ??
      existingSummaryMaps.summaryByFingerprint.get(entry.candidate.titleFingerprint) ??
      null;

    const summary = await summarizeCandidate(entry.candidate, {
      existingSummary,
      forceResummarize: true,
    });

    refreshedCandidates.push({
      sourceId: entry.sourceId,
      existingId: entry.existingId,
      candidate: {
        ...entry.candidate,
        ...summary,
      },
    });
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let dryRun = runContext.dryRun;

  const touchResult = await touchExistingStories(existingStoryIdsToTouch).catch((error) => {
    const message = error instanceof Error ? error.message : "Unable to touch existing stories.";
    errors.push(`touch-existing: ${message}`);
    return {
      dryRun: runContext.dryRun,
      updatedCount: 0,
    };
  });

  updatedCount += touchResult.updatedCount;
  dryRun = dryRun || touchResult.dryRun;

  if (touchResult.updatedCount > 0) {
    existingStoryIdsBySource.forEach((ids, sourceId) => {
      const counters = sourceCounters.get(sourceId);

      if (!counters) {
        return;
      }

      counters.updatedCount += Array.from(new Set(ids)).length;
    });
  }

  const storage = await storeNewCandidates(summarized).catch((error) => {
    const message = error instanceof Error ? error.message : "Unable to store candidates.";
    errors.push(`store-candidates: ${message}`);

    return {
      dryRun: runContext.dryRun,
      insertedCount: 0,
      insertedRows: [] as Array<{ id: string; slug: string }>,
    };
  });

  insertedCount += storage.insertedCount;
  dryRun = dryRun || storage.dryRun;

  const refreshedStorage = await updateExistingCandidates(refreshedCandidates).catch((error) => {
    const message = error instanceof Error ? error.message : "Unable to refresh existing candidates.";
    errors.push(`refresh-candidates: ${message}`);

    return {
      dryRun: runContext.dryRun,
      updatedCount: 0,
    };
  });

  updatedCount += refreshedStorage.updatedCount;
  dryRun = dryRun || refreshedStorage.dryRun;

  const insertedSlugSet = new Set(storage.insertedRows.map((row) => row.slug));

  summarized.forEach((item) => {
    if (!insertedSlugSet.has(item.slug)) {
      return;
    }

    const counters = sourceCounters.get(item.sourceId);

    if (!counters) {
      return;
    }

    counters.insertedCount += 1;
    counters.lastNewItemAt =
      counters.lastNewItemAt && new Date(counters.lastNewItemAt) > new Date(item.publishedAt)
        ? counters.lastNewItemAt
        : item.publishedAt;
  });

  refreshedCandidates.forEach((item) => {
    const counters = sourceCounters.get(item.sourceId);

    if (!counters) {
      return;
    }

    counters.updatedCount += 1;
    counters.lastNewItemAt =
      counters.lastNewItemAt && new Date(counters.lastNewItemAt) > new Date(item.candidate.publishedAt)
        ? counters.lastNewItemAt
        : item.candidate.publishedAt;
  });

  const sourceRunResults = [...sourceCounters.values()].map((counters) => buildSourceRunResult(counters));

  await Promise.all(
    sourceRunResults.map(async (result) => {
      try {
        await recordSourceRun(runContext, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to persist source run.";
        errors.push(`run-source:${result.sourceId}: ${message}`);
      }
    }),
  );

  try {
    await upsertSourceHealth(
      [...sourceCounters.values()].map((counters) => ({
        source: counters.source,
        result: buildSourceRunResult(counters),
        lastNewItemAt: counters.lastNewItemAt,
      })),
      sourceHealthRows,
    );
  } catch (error) {
    errors.push(`source-health: ${error instanceof Error ? error.message : "Unable to update source health"}`);
  }

  const sourceFailureCount = sourceRunResults.filter((result) => result.status === "error").length;
  const sourceSuccessCount = sourceRunResults.length - sourceFailureCount;
  const fetchedCount = sourceAttempts.reduce((sum, attempt) => sum + attempt.items.length, 0);
  const duplicatesFiltered = [...sourceCounters.values()].reduce((sum, counters) => sum + counters.duplicatesFiltered, 0);
  const invalidRejected = [...sourceCounters.values()].reduce((sum, counters) => sum + counters.invalidRejected, 0);
  const oldRejected = [...sourceCounters.values()].reduce((sum, counters) => sum + counters.oldRejected, 0);
  const normalizedCount = candidateEnvelopes.length;
  const completedAt = new Date().toISOString();
  const durationMs = new Date(completedAt).getTime() - new Date(runContext.startedAt).getTime();
  const status =
    sourceSuccessCount === 0
      ? "error"
      : sourceFailureCount > 0 || errors.length > 0
        ? "partial_success"
        : "success";
  const statusReason =
    dryRun
      ? normalizedCount > 0
        ? `Dry run completed — ${normalizedCount} qualifying stories passed validation${forceResummarize ? " and summaries were refreshed in preview mode" : ""}.`
        : "Dry run completed — sources checked successfully, with no qualifying stories."
      : status === "success"
      ? insertedCount > 0
        ? `All systems live — inserted ${insertedCount} new stories.`
        : updatedCount > 0
          ? forceResummarize
            ? `Sources checked successfully; refreshed ${updatedCount} existing stories.`
            : "Sources checked successfully; no new unique stories."
          : "Sources checked successfully; no qualifying stories."
      : status === "partial_success"
        ? `${sourceFailureCount} of ${selectedSources.length} sources failed, but healthy sources still updated the feed.`
        : "All sources failed during this ingestion run.";

  try {
    await completePipelineRun({
      context: runContext,
      status,
      statusReason,
      completedAt,
      durationMs,
      sourceCount: selectedSources.length,
      sourceSuccessCount,
      sourceFailureCount,
      fetchedCount,
      normalizedCount,
      insertedCount,
      updatedCount,
      duplicatesFiltered,
      invalidRejected,
      oldRejected,
      errors,
    });
  } catch (error) {
    errors.push(`pipeline-state: ${error instanceof Error ? error.message : "Unable to finalize ingestion run"}`);
  }

  const healthSnapshot = await getSourceHealthSnapshot(sourceRegistry);
  const staleSourceIds = healthSnapshot.sources.filter((source) => source.stale).map((source) => source.sourceId);
  const newBreakingItems = summarized.filter((item) => item.importanceScore >= 8);

  if (!storage.dryRun && newBreakingItems.length > 0) {
    try {
      await sendBreakingNewsNotifications(newBreakingItems);
    } catch (error) {
      errors.push(`push-notifications: ${error instanceof Error ? error.message : "Unknown push notification error"}`);
    }
  }

  logIngestionEvent("run_completed", {
    runId: runContext.runId,
    status,
    statusReason,
    durationMs,
    sourceCount: selectedSources.length,
    sourceSuccessCount,
    sourceFailureCount,
    fetchedCount,
    normalizedCount,
    insertedCount,
    updatedCount,
    duplicatesFiltered,
    invalidRejected,
    oldRejected,
    errorCount: errors.length,
  });

  return {
    runId: runContext.runId,
    pipelineName: PIPELINE_NAME,
    triggerKind,
    targetScope,
    status,
    statusReason,
    startedAt: runContext.startedAt,
    completedAt,
    durationMs,
    sourceCount: selectedSources.length,
    sourceSuccessCount,
    sourceFailureCount,
    fetchedCount,
    normalizedCount,
    insertedCount,
    updatedCount,
    storedCount: insertedCount + updatedCount,
    duplicatesFiltered,
    invalidRejected,
    oldRejected,
    dryRun,
    overlapPrevented: runContext.overlapPrevented,
    lastIngestionAt: healthSnapshot.lastIngestionAt,
    errors,
    items: [...summarized, ...refreshedCandidates.map((item) => item.candidate)],
    sourceStatuses: healthSnapshot.sources,
    staleSourceIds,
    sources: sourceRunResults,
    health: healthSnapshot,
  };
}

export async function runPriorityIngestion(triggerKind: PipelineTriggerKind = "manual") {
  return runIngestionPipeline({
    selectedSourceIds: sourceRegistry.filter((source) => source.priority === 1).map((source) => source.id),
    triggerKind,
    targetScope: "priority",
  });
}
