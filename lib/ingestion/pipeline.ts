import { getSupabaseServerClient } from "../db/client.ts";
import type { RawIngestedItem, PipelineRunResult, SourceDefinition, SummarizedCandidate } from "./types.ts";
import { normalizeIngestedItem } from "./normalizer.ts";
import { sendBreakingNewsNotifications } from "../notifications/web-push.ts";
import { scoreCandidate } from "./scorer.ts";
import { resetSummarizerRunState, summarizeCandidate } from "./summarizer.ts";
import { ingest as ingestApi } from "./sources/api.ts";
import { ingest as ingestBlog } from "./sources/blog-scraper.ts";
import { ingest as ingestManual } from "./sources/manual.ts";
import { ingest as ingestRss } from "./sources/rss.ts";

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

export const sourceRegistry: SourceDefinition[] = [
  {
    id: "openai-news",
    name: "OpenAI News",
    kind: "rss",
    url: "https://openai.com/news/rss.xml",
    companyHint: "openai",
    reliability: 0.98,
    priority: 1,
    maxItems: 12,
  },
  {
    id: "anthropic-newsroom",
    name: "Anthropic Newsroom",
    kind: "rss",
    url: "https://www.anthropic.com/sitemap.xml",
    companyHint: "anthropic",
    reliability: 0.96,
    priority: 1,
    maxItems: 10,
    itemUrlPrefixes: ["https://www.anthropic.com/news/"],
  },
  {
    id: "google-deepmind-blog",
    name: "Google DeepMind Blog",
    kind: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    companyHint: "google-deepmind",
    reliability: 0.97,
    priority: 1,
    maxItems: 12,
  },
  {
    id: "meta-ai-news",
    name: "Meta AI News",
    kind: "rss",
    url: "https://about.fb.com/news/feed/",
    companyHint: "meta-ai",
    reliability: 0.92,
    priority: 1,
    maxItems: 12,
    includeKeywords: metaAiFeedKeywords,
  },
  {
    id: "microsoft-ai-news",
    name: "Microsoft AI News",
    kind: "rss",
    url: "https://news.microsoft.com/source/topics/ai/feed/",
    companyHint: "microsoft-ai",
    reliability: 0.96,
    priority: 1,
    maxItems: 12,
  },
  {
    id: "mistral-news",
    name: "Mistral News",
    kind: "rss",
    url: "https://mistral.ai/sitemap.xml",
    companyHint: "mistral",
    reliability: 0.95,
    priority: 1,
    maxItems: 10,
    itemUrlPrefixes: ["https://mistral.ai/news/"],
  },
  {
    id: "nvidia-blog",
    name: "NVIDIA Blog",
    kind: "rss",
    url: "https://blogs.nvidia.com/feed/",
    companyHint: "nvidia",
    reliability: 0.94,
    priority: 1,
    maxItems: 12,
    includeKeywords: nvidiaAiFeedKeywords,
  },
  {
    id: "hacker-news-ai",
    name: "Hacker News AI",
    kind: "api",
    url: "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=30",
    reliability: 0.7,
    priority: 2,
    maxItems: 15,
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
    maxItems: 16,
    api: {
      provider: "reddit",
      subreddits: ["MachineLearning", "artificial"],
      timeframe: "day",
      limit: 20,
    },
  },
  // xAI does not currently expose a server-fetchable official feed endpoint,
  // so it stays off the registry until an official source becomes available.
  {
    id: "manual-watchlist",
    name: "Manual Watchlist",
    kind: "manual",
    reliability: 0.6,
    priority: 3,
    items: [],
  },
];

function dedupeRawItems(items: RawIngestedItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.url}|${item.title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
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

async function storeCandidates(candidates: SummarizedCandidate[]) {
  const client = getSupabaseServerClient();

  if (!client) {
    return {
      dryRun: true,
      storedCount: 0,
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

  const newsPayload = candidates.map((candidate) => ({
    headline: candidate.headline,
    slug: candidate.slug,
    source_name: candidate.sourceName,
    source_url: candidate.sourceUrl,
    published_at: candidate.publishedAt,
    ingested_at: new Date().toISOString(),
    raw_text: candidate.rawText,
    cleaned_text: candidate.cleanedText,
    summary: candidate.summary,
    short_summary: candidate.shortSummary,
    why_it_matters: candidate.whyItMatters,
    importance_score: candidate.importanceScore,
    confidence_score: candidate.confidenceScore,
    impact_direction: candidate.impactDirection,
  }));

  const { data: insertedNews, error: newsError } = await client
    .from("news_items")
    .upsert(newsPayload, { onConflict: "slug" })
    .select("id, slug");

  if (newsError || !insertedNews) {
    throw newsError ?? new Error("Unable to store ingested news items.");
  }

  const newsIdBySlug = Object.fromEntries(insertedNews.map((row) => [row.slug, row.id]));

  const companyNewsPayload = candidates.flatMap((candidate) =>
    candidate.companySlugs
      .filter((slug) => companyIdBySlug[slug])
      .map((slug) => ({
        company_id: companyIdBySlug[slug],
        news_item_id: newsIdBySlug[candidate.slug],
      })),
  );

  const categoryPayload = candidates.flatMap((candidate) =>
    candidate.categorySlugs
      .filter((slug) => categoryIdBySlug[slug])
      .map((slug) => ({
        news_item_id: newsIdBySlug[candidate.slug],
        category_id: categoryIdBySlug[slug],
      })),
  );

  const tagPayload = candidates.flatMap((candidate) =>
    candidate.tagSlugs
      .filter((slug) => tagIdBySlug[slug])
      .map((slug) => ({
        news_item_id: newsIdBySlug[candidate.slug],
        tag_id: tagIdBySlug[slug],
      })),
  );

  await Promise.all([
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

  return {
    dryRun: false,
    storedCount: insertedNews.length,
  };
}

async function getExistingSummaries(slugs: string[]) {
  const client = getSupabaseServerClient();

  if (!client || slugs.length === 0) {
    return new Map<string, { summary: string; shortSummary: string; whyItMatters: string }>();
  }

  const { data, error } = await client
    .from("news_items")
    .select("slug, summary, short_summary, why_it_matters")
    .in("slug", slugs);

  if (error || !data) {
    return new Map<string, { summary: string; shortSummary: string; whyItMatters: string }>();
  }

  return new Map(
    data.map((row) => [
      row.slug,
      {
        summary: row.summary,
        shortSummary: row.short_summary,
        whyItMatters: row.why_it_matters,
      },
    ]),
  );
}

export async function runIngestionPipeline(
  selectedSourceIds: string[] = sourceRegistry.map((source) => source.id),
): Promise<PipelineRunResult> {
  resetSummarizerRunState();

  const selectedSources = sourceRegistry.filter((source) => selectedSourceIds.includes(source.id));
  const errors: string[] = [];
  const rawItems: RawIngestedItem[] = [];

  for (const source of selectedSources) {
    try {
      rawItems.push(...(await ingestSource(source)));
    } catch (error) {
      errors.push(`${source.id}: ${error instanceof Error ? error.message : "Unknown ingestion error"}`);
    }
  }

  const dedupedItems = dedupeRawItems(rawItems);
  const normalized = dedupedItems
    .map((item) => {
      const normalizedCandidate = normalizeIngestedItem(item);

      if (!normalizedCandidate) {
        return null;
      }

      const scores = scoreCandidate(normalizedCandidate, item);

      return {
        item,
        candidate: {
          ...normalizedCandidate,
          ...scores,
        },
      };
    })
    .filter(Boolean) as Array<{ item: RawIngestedItem; candidate: ReturnType<typeof scoreCandidate> & ReturnType<typeof normalizeIngestedItem> }>;

  const existingSummaries = await getExistingSummaries(normalized.map((entry) => entry.candidate.slug));
  const summarized: SummarizedCandidate[] = [];

  for (const entry of normalized) {
    const summary = await summarizeCandidate(entry.candidate, {
      existingSummary: existingSummaries.get(entry.candidate.slug) ?? null,
    });
    summarized.push({
      ...entry.candidate,
      ...summary,
    });
  }

  const storage = await storeCandidates(summarized);
  const newBreakingItems = summarized.filter((item) => item.importanceScore >= 8 && !existingSummaries.has(item.slug));

  if (!storage.dryRun && newBreakingItems.length > 0) {
    try {
      await sendBreakingNewsNotifications(newBreakingItems);
    } catch (error) {
      errors.push(`push-notifications: ${error instanceof Error ? error.message : "Unknown push notification error"}`);
    }
  }

  return {
    sourceCount: selectedSources.length,
    fetchedCount: rawItems.length,
    normalizedCount: summarized.length,
    storedCount: storage.storedCount,
    dryRun: storage.dryRun,
    errors,
    items: summarized,
  };
}
