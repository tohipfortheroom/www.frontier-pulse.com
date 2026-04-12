import { subDays } from "date-fns";

import { getSupabaseServiceClient } from "@/lib/db/client";
import type { CompanyRow, EventRow, NewsItemRow } from "@/lib/db/types";
import { getErrorMessage, isSupabaseMissingTableError } from "@/lib/error-utils";
import { toHistoryDateKey } from "@/lib/score-history";
import { calculateMomentumChange, calculateMomentumScore, getBaseWeight, type EventType } from "@/lib/scoring/momentum";

type CompanyNewsRow = {
  company_id: string;
  news_item_id: string;
};

type NewsItemCategoryRow = {
  news_item_id: string;
  category_id: string;
};

type CategoryRow = {
  id: string;
  slug: string;
};

type NewsItemMomentum = {
  companyId: string;
  newsId: string;
  eventType: EventType;
  eventDate: string;
  scoreDelta: number;
  explanation: string;
};

const CATEGORY_PRIORITY: Array<{ slug: string; eventType: EventType }> = [
  { slug: "model-release", eventType: "Major model release" },
  { slug: "product-launch", eventType: "Major product launch" },
  { slug: "acquisition", eventType: "Major acquisition" },
  { slug: "partnership", eventType: "Enterprise partnership" },
  { slug: "funding", eventType: "Funding round" },
  { slug: "infrastructure", eventType: "Infrastructure expansion" },
  { slug: "research", eventType: "Research breakthrough" },
  { slug: "benchmark", eventType: "Benchmark claim" },
  { slug: "leadership", eventType: "Executive change" },
  { slug: "policy-regulation", eventType: "Regulatory setback" },
  { slug: "controversy", eventType: "Controversy" },
];

function pickEventType(categorySlugs: string[]): EventType | null {
  for (const entry of CATEGORY_PRIORITY) {
    if (categorySlugs.includes(entry.slug)) {
      return entry.eventType;
    }
  }

  return null;
}

function buildScoreDelta(baseEventType: EventType, importanceScore: number, impactDirection: "positive" | "negative" | "neutral") {
  const baseWeight = getBaseWeight(baseEventType);
  const importanceBoost = (importanceScore - 5) * 0.5;

  let score = baseWeight;

  if (baseWeight > 0 && impactDirection === "negative") {
    score = -baseWeight;
  } else if (baseWeight < 0 && impactDirection === "positive") {
    score = Math.abs(baseWeight);
  }

  if (importanceBoost !== 0) {
    score += score >= 0 ? importanceBoost : -importanceBoost;
  }

  return Number(score.toFixed(2));
}

function buildExplanation(news: NewsItemRow) {
  return news.short_summary || news.why_it_matters || news.summary || news.headline;
}

function buildEventsPayload(eventsToUpsert: NewsItemMomentum[], roundScoreDelta = false) {
  const createdAt = new Date().toISOString();

  return eventsToUpsert.map((event) => ({
    company_id: event.companyId,
    news_item_id: event.newsId,
    event_type: event.eventType,
    score_delta: roundScoreDelta ? Math.round(event.scoreDelta) : event.scoreDelta,
    event_date: event.eventDate,
    explanation: event.explanation,
    created_at: createdAt,
  }));
}

function shouldRetryEventUpsertWithRoundedScores(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    (
      message.includes("score_delta") ||
      message.includes("invalid input syntax for type integer") ||
      message.includes("type integer")
    ) &&
    (
      message.includes("integer") ||
      message.includes("numeric") ||
      message.includes("type mismatch")
    )
  );
}

function normalizeReferenceDate(referenceDateInput?: Date | string) {
  const referenceDate = referenceDateInput ? new Date(referenceDateInput) : new Date();

  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error(`Invalid reference date: ${referenceDateInput}`);
  }

  return referenceDate;
}

export async function recomputeLeaderboardFromNews(referenceDateInput?: Date | string) {
  const client = getSupabaseServiceClient();

  if (!client) {
    throw new Error("Supabase service role is not configured.");
  }

  const referenceDate = normalizeReferenceDate(referenceDateInput);

  const [companyResult, newsResult, companyNewsResult, categoryResult, newsCategoryResult] = await Promise.all([
    client.from("companies").select("id, slug").order("name"),
    client.from("news_items").select("*").order("published_at", { ascending: false }),
    client.from("company_news").select("company_id, news_item_id"),
    client.from("categories").select("id, slug"),
    client.from("news_item_categories").select("news_item_id, category_id"),
  ]);

  if (companyResult.error || newsResult.error || companyNewsResult.error || categoryResult.error || newsCategoryResult.error) {
    throw companyResult.error ?? newsResult.error ?? companyNewsResult.error ?? categoryResult.error ?? newsCategoryResult.error;
  }

  const companyRows = (companyResult.data ?? []) as CompanyRow[];
  const newsRows = (newsResult.data ?? []) as NewsItemRow[];
  const companyNewsRows = (companyNewsResult.data ?? []) as CompanyNewsRow[];
  const categoryRows = (categoryResult.data ?? []) as CategoryRow[];
  const newsCategoryRows = (newsCategoryResult.data ?? []) as NewsItemCategoryRow[];

  const categoryById = new Map(categoryRows.map((row) => [row.id, row.slug]));
  const categorySlugsByNewsId = new Map<string, string[]>();

  for (const row of newsCategoryRows) {
    const slug = categoryById.get(row.category_id);
    if (!slug) {
      continue;
    }
    const current = categorySlugsByNewsId.get(row.news_item_id) ?? [];
    current.push(slug);
    categorySlugsByNewsId.set(row.news_item_id, current);
  }

  const companyNewsByNewsId = new Map<string, string[]>();
  for (const row of companyNewsRows) {
    const current = companyNewsByNewsId.get(row.news_item_id) ?? [];
    current.push(row.company_id);
    companyNewsByNewsId.set(row.news_item_id, current);
  }

  const eventsToUpsert: NewsItemMomentum[] = [];

  for (const news of newsRows) {
    const companyIds = companyNewsByNewsId.get(news.id) ?? [];
    if (companyIds.length === 0) {
      continue;
    }

    const categorySlugs = categorySlugsByNewsId.get(news.id) ?? [];
    const eventType = pickEventType(categorySlugs);
    if (!eventType) {
      continue;
    }

    const scoreDelta = buildScoreDelta(eventType, news.importance_score, news.impact_direction);
    const explanation = buildExplanation(news);

    for (const companyId of companyIds) {
      eventsToUpsert.push({
        companyId,
        newsId: news.id,
        eventType,
        eventDate: news.published_at,
        scoreDelta,
        explanation,
      });
    }
  }

  if (eventsToUpsert.length > 0) {
    const eventPayload = buildEventsPayload(eventsToUpsert);
    const { error: eventUpsertError } = await client
      .from("events")
      .upsert(eventPayload, { onConflict: "company_id,news_item_id,event_type,event_date" });

    if (eventUpsertError) {
      if (!shouldRetryEventUpsertWithRoundedScores(eventUpsertError)) {
        throw eventUpsertError;
      }

      const { error: roundedEventUpsertError } = await client
        .from("events")
        .upsert(buildEventsPayload(eventsToUpsert, true), { onConflict: "company_id,news_item_id,event_type,event_date" });

      if (roundedEventUpsertError) {
        throw roundedEventUpsertError;
      }
    }
  }

  const cutoff = subDays(referenceDate, 30).toISOString();
  const { data: eventRows, error: eventFetchError } = await client
    .from("events")
    .select("*")
    .gte("event_date", cutoff)
    .order("event_date", { ascending: false });

  if (eventFetchError) {
    throw eventFetchError;
  }

  const events = (eventRows ?? []) as EventRow[];
  const companyById = new Map(companyRows.map((row) => [row.id, row.slug]));
  const momentumEvents = events
    .map((row) => {
      const slug = companyById.get(row.company_id);
      if (!slug) {
        return null;
      }
      return {
        companySlug: slug,
        eventType: row.event_type as EventType,
        scoreDelta: row.score_delta,
        eventDate: row.event_date,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const momentumScoresPayload = companyRows.map((company) => {
    const companySlug = company.slug;
    const score = calculateMomentumScore(momentumEvents, companySlug, referenceDate);
    const change24h = calculateMomentumChange(momentumEvents, companySlug, referenceDate, 1);
    const change7d = calculateMomentumChange(momentumEvents, companySlug, referenceDate, 7);

    return {
      company_id: company.id,
      score: Number(score.toFixed(2)),
      score_change_24h: Number(change24h.toFixed(2)),
      score_change_7d: Number(change7d.toFixed(2)),
      calculated_at: referenceDate.toISOString(),
    };
  });

  const { error: momentumError } = await client
    .from("momentum_scores")
    .upsert(momentumScoresPayload, { onConflict: "company_id,calculated_at" });

  if (momentumError) {
    throw momentumError;
  }

  const dateKey = toHistoryDateKey(referenceDate);

  if (dateKey) {
    const momentumHistoryPayload = momentumScoresPayload.map((row) => ({
      company_id: row.company_id,
      date_key: dateKey,
      score: row.score,
      calculated_at: row.calculated_at,
    }));

    const { error: historyError } = await client
      .from("momentum_score_history")
      .upsert(momentumHistoryPayload, { onConflict: "company_id,date_key" });

    if (historyError && !isSupabaseMissingTableError(historyError, "momentum_score_history")) {
      throw historyError;
    }

    return {
      eventsGenerated: eventsToUpsert.length,
      momentumRows: momentumScoresPayload.length,
      calculatedAt: referenceDate.toISOString(),
      historyPersisted: !historyError,
    };
  }

  return {
    eventsGenerated: eventsToUpsert.length,
    momentumRows: momentumScoresPayload.length,
    calculatedAt: referenceDate.toISOString(),
    historyPersisted: false,
  };
}
