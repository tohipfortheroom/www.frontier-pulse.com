import { getSupabaseServerClient } from "@/lib/db/client";
import type { RawIngestedItem, PipelineRunResult, SourceDefinition, SummarizedCandidate } from "@/lib/ingestion/types";
import { normalizeIngestedItem } from "@/lib/ingestion/normalizer";
import { scoreCandidate } from "@/lib/ingestion/scorer";
import { summarizeCandidate } from "@/lib/ingestion/summarizer";
import { ingest as ingestBlog } from "@/lib/ingestion/sources/blog-scraper";
import { ingest as ingestManual } from "@/lib/ingestion/sources/manual";
import { ingest as ingestRss } from "@/lib/ingestion/sources/rss";

export const sourceRegistry: SourceDefinition[] = [
  {
    id: "openai-news",
    name: "OpenAI News",
    kind: "rss",
    url: "https://openai.com/news/rss.xml",
    companyHint: "openai",
    reliability: 0.98,
    priority: 1,
  },
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

export async function runIngestionPipeline(
  selectedSourceIds: string[] = sourceRegistry.map((source) => source.id),
): Promise<PipelineRunResult> {
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

  const summarized: SummarizedCandidate[] = [];

  for (const entry of normalized) {
    const summary = await summarizeCandidate(entry.candidate);
    summarized.push({
      ...entry.candidate,
      ...summary,
    });
  }

  const storage = await storeCandidates(summarized);

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
