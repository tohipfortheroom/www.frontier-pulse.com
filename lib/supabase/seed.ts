import { createClient } from "@supabase/supabase-js";

import {
  categories,
  companies,
  dailyDigest,
  momentumEvents,
  momentumSnapshots,
  seedNow,
  sortedNewsItems,
  tags,
} from "../seed/data";

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

async function main() {
  const categoryRows = await upsertAndSelect(
    "categories",
    categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    "slug",
  );

  const tagRows = await upsertAndSelect(
    "tags",
    tags.map((tag) => ({
      name: tag.name,
      slug: tag.slug,
    })),
    "slug",
  );

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
        score_change_24h: index === values.length - 1 ? snapshot.scoreChange24h : Number((score - (values[index - 1] ?? score)).toFixed(1)),
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
      created_at: seedNow.toISOString(),
    },
    { onConflict: "digest_date" },
  );

  if (digestError) {
    throw digestError;
  }

  console.log(
    `Seeded ${companies.length} companies, ${sortedNewsItems.length} news items, ${momentumEvents.length} events, and 1 daily digest.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
