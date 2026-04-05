import { createClient } from "@supabase/supabase-js";

import { sourceRegistry } from "../ingestion/pipeline.ts";
import {
  categories,
  companies,
  dailyDigest,
  momentumEvents,
  momentumSnapshots,
  newsletterSubscribers,
  seedNow,
  sortedNewsItems,
  sourceHealthSeed,
  tags,
} from "./data.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type MappedRow = {
  id: string;
  slug: string;
};

function rowMap(rows: MappedRow[]) {
  return Object.fromEntries(rows.map((row) => [row.slug, row.id])) as Record<string, string>;
}

async function upsertAndSelect(table: string, payload: Record<string, unknown>[], onConflict: string) {
  const { data, error } = await supabase.from(table).upsert(payload, { onConflict }).select("id, slug");

  if (error || !data) {
    throw error ?? new Error(`Failed to seed ${table}`);
  }

  return data as MappedRow[];
}

export async function main() {
  console.log("Seeding Frontier Pulse data into Supabase...");

  const categoryRows = await upsertAndSelect(
    "categories",
    categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    "slug",
  );
  console.log(`Seeded ${categoryRows.length} categories.`);

  const tagRows = await upsertAndSelect(
    "tags",
    tags.map((tag) => ({
      name: tag.name,
      slug: tag.slug,
    })),
    "slug",
  );
  console.log(`Seeded ${tagRows.length} tags.`);

  const companyRows = await upsertAndSelect(
    "companies",
    companies.map((company) => ({
      name: company.name,
      slug: company.slug,
      logo_url: null,
      description: company.description,
      overview: company.overview,
      strengths: company.strengths,
      weaknesses: company.weaknesses,
      why_it_matters: company.whyItMatters,
      valuation_text: company.valuationText ?? null,
      website_url: company.websiteUrl,
      created_at: seedNow.toISOString(),
      updated_at: seedNow.toISOString(),
    })),
    "slug",
  );
  console.log(`Seeded ${companyRows.length} companies.`);

  const categoryIdBySlug = rowMap(categoryRows);
  const tagIdBySlug = rowMap(tagRows);
  const companyIdBySlug = rowMap(companyRows);

  const companyProductsPayload = companies.flatMap((company) =>
    company.products.map((product) => ({
      company_id: companyIdBySlug[company.slug],
      name: product.name,
      type: product.type,
      description: product.description,
      launch_date: product.launchDate ?? null,
      created_at: seedNow.toISOString(),
    })),
  );

  const { error: productsError } = await supabase
    .from("company_products")
    .upsert(companyProductsPayload, { onConflict: "company_id,name" });

  if (productsError) {
    throw productsError;
  }

  const newsRows = await upsertAndSelect(
    "news_items",
    sortedNewsItems.map((item) => ({
      headline: item.headline,
      slug: item.slug,
      source_name: item.sourceName,
      source_url: item.sourceUrl,
      published_at: item.publishedAt,
      ingested_at: item.publishedAt,
      raw_text: null,
      cleaned_text: null,
      summary: item.summary,
      short_summary: item.shortSummary,
      why_it_matters: item.whyItMatters,
      importance_score: item.importanceScore,
      confidence_score: item.confidenceScore,
      impact_direction: item.impactDirection,
      created_at: item.publishedAt,
    })),
    "slug",
  );
  console.log(`Seeded ${newsRows.length} news items.`);

  const newsIdBySlug = rowMap(newsRows);

  const newsItemCategoriesPayload = sortedNewsItems.flatMap((item) =>
    item.categorySlugs.map((categorySlug) => ({
      news_item_id: newsIdBySlug[item.slug],
      category_id: categoryIdBySlug[categorySlug],
    })),
  );

  const { error: categoriesError } = await supabase
    .from("news_item_categories")
    .upsert(newsItemCategoriesPayload, { onConflict: "news_item_id,category_id" });

  if (categoriesError) {
    throw categoriesError;
  }

  const newsItemTagsPayload = sortedNewsItems.flatMap((item) =>
    item.tagSlugs.map((tagSlug) => ({
      news_item_id: newsIdBySlug[item.slug],
      tag_id: tagIdBySlug[tagSlug],
    })),
  );

  const { error: tagsError } = await supabase
    .from("news_item_tags")
    .upsert(newsItemTagsPayload, { onConflict: "news_item_id,tag_id" });

  if (tagsError) {
    throw tagsError;
  }

  const companyNewsPayload = sortedNewsItems.flatMap((item) =>
    item.companySlugs.map((companySlug) => ({
      company_id: companyIdBySlug[companySlug],
      news_item_id: newsIdBySlug[item.slug],
    })),
  );

  const { error: companyNewsError } = await supabase
    .from("company_news")
    .upsert(companyNewsPayload, { onConflict: "company_id,news_item_id" });

  if (companyNewsError) {
    throw companyNewsError;
  }

  const eventsPayload = momentumEvents.map((event) => ({
    company_id: companyIdBySlug[event.companySlug],
    news_item_id: newsIdBySlug[event.newsSlug],
    event_type: event.eventType,
    score_delta: event.scoreDelta,
    event_date: event.eventDate,
    explanation: event.explanation,
    created_at: event.eventDate,
  }));

  const { error: eventsError } = await supabase
    .from("events")
    .upsert(eventsPayload, { onConflict: "company_id,news_item_id,event_type,event_date" });

  if (eventsError) {
    throw eventsError;
  }

  const momentumScoresPayload = momentumSnapshots.flatMap((snapshot) =>
    snapshot.sparkline.map((score, index, values) => {
      const calculatedAt = new Date("2026-03-28T12:00:00-05:00");
      calculatedAt.setDate(calculatedAt.getDate() + index);

      return {
        company_id: companyIdBySlug[snapshot.companySlug],
        score,
        score_change_24h:
          index === values.length - 1 ? snapshot.scoreChange24h : Number((score - (values[index - 1] ?? score)).toFixed(1)),
        score_change_7d: index === values.length - 1 ? snapshot.scoreChange7d : Number((score - values[0]).toFixed(1)),
        calculated_at: calculatedAt.toISOString(),
      };
    }),
  );

  const { error: momentumError } = await supabase
    .from("momentum_scores")
    .upsert(momentumScoresPayload, { onConflict: "company_id,calculated_at" });

  if (momentumError) {
    throw momentumError;
  }

  const { error: digestError } = await supabase.from("daily_digests").upsert(
    {
      digest_date: dailyDigest.date,
      title: dailyDigest.title,
      summary: dailyDigest.summary,
      biggest_winner_company_id: companyIdBySlug[dailyDigest.biggestWinnerCompanySlug],
      biggest_loser_company_id: companyIdBySlug[dailyDigest.biggestLoserCompanySlug],
      most_important_news_item_id: newsIdBySlug[dailyDigest.mostImportantNewsSlug],
      top_story_slugs: dailyDigest.topStorySlugs,
      watch_next: dailyDigest.watchNext,
      created_at: seedNow.toISOString(),
    },
    { onConflict: "digest_date" },
  );

  if (digestError) {
    throw digestError;
  }

  const { error: subscribersError } = await supabase.from("subscribers").upsert(
    newsletterSubscribers.map((subscriber) => ({
      email: subscriber.email,
      confirmed: subscriber.confirmed,
      subscribed_at: subscriber.subscribedAt,
      unsubscribe_token: subscriber.unsubscribeToken,
    })),
    { onConflict: "email" },
  );

  if (subscribersError) {
    throw subscribersError;
  }

  const sourceMetaById = Object.fromEntries(sourceRegistry.map((source) => [source.id, source]));
  const { error: sourceHealthError } = await supabase.from("source_health").upsert(
    sourceHealthSeed.map((entry) => ({
      source_id: entry.sourceId,
      source_name: sourceMetaById[entry.sourceId]?.name ?? entry.sourceId,
      source_kind: sourceMetaById[entry.sourceId]?.kind ?? "manual",
      priority: sourceMetaById[entry.sourceId]?.priority ?? 3,
      reliability: sourceMetaById[entry.sourceId]?.reliability ?? 0.5,
      last_fetched_at: entry.lastFetchedAt,
      last_success_at: entry.lastSuccessAt,
      last_status: entry.lastStatus,
      last_error: entry.lastError ?? null,
      last_items_returned: entry.lastItemsReturned,
      last_items_stored: entry.lastItemsStored,
      last_new_item_at: entry.lastNewItemAt ?? null,
      last_checked_at: entry.lastCheckedAt ?? entry.lastFetchedAt,
      last_succeeded_at: entry.lastSucceededAt ?? entry.lastSuccessAt,
      last_failed_at: entry.lastFailedAt ?? (entry.lastStatus === "error" ? entry.lastFetchedAt : null),
      status: entry.status ?? (entry.lastStatus === "error" ? "error" : "live"),
      failure_reason: entry.failureReason ?? entry.lastError ?? null,
      consecutive_failures: entry.consecutiveFailures ?? (entry.lastStatus === "error" ? 1 : 0),
      latest_item_published_at: entry.latestItemPublishedAt ?? entry.lastNewItemAt ?? null,
      last_duration_ms: entry.lastDurationMs ?? null,
      items_fetched: entry.itemsFetched ?? entry.lastItemsReturned,
      items_inserted: entry.itemsInserted ?? entry.lastItemsStored,
      items_updated: entry.itemsUpdated ?? 0,
      duplicates_filtered: entry.duplicatesFiltered ?? 0,
      invalid_rejected: entry.invalidRejected ?? 0,
      old_rejected: entry.oldRejected ?? 0,
      updated_at: entry.lastFetchedAt,
    })),
    { onConflict: "source_id" },
  );

  if (sourceHealthError) {
    throw sourceHealthError;
  }

  const latestAttemptedAt = sourceHealthSeed
    .map((entry) => entry.lastCheckedAt ?? entry.lastFetchedAt)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  const latestSucceededAt = sourceHealthSeed
    .map((entry) => entry.lastSucceededAt ?? entry.lastSuccessAt)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  const { error: pipelineStateError } = await supabase.from("pipeline_state").upsert(
    {
      pipeline_name: "frontier-pulse-news",
      last_attempted_at: latestAttemptedAt,
      last_succeeded_at: latestSucceededAt,
      last_full_success_at: latestSucceededAt,
      last_partial_success_at: null,
      current_status: "live",
      current_status_reason: "Seed snapshot loaded successfully.",
      consecutive_failures: 0,
      last_run_duration_ms: 12_000,
    },
    { onConflict: "pipeline_name" },
  );

  if (pipelineStateError) {
    throw pipelineStateError;
  }

  console.log(
    `Seeded ${companies.length} companies, ${sortedNewsItems.length} news items, ${momentumEvents.length} events, 1 daily digest, ${newsletterSubscribers.length} subscribers, and ${sourceHealthSeed.length} source health records.`,
  );
}

if (process.argv[1]?.endsWith("seed-db.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
