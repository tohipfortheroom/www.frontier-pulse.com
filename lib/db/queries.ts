import { cache } from "react";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";

import { getSupabaseServerClient } from "@/lib/db/client";
import type {
  CompanyCardRecord,
  CompanyDetailRecord,
  CompanyProductRow,
  CompanyRow,
  DailyDigestRecord,
  DailyDigestRow,
  EventRow,
  HeatmapCell,
  HeatmapData,
  HomePageData,
  MomentumScoreRow,
  NewsDetailRecord,
  NewsItemRow,
} from "@/lib/db/types";
import {
  categories,
  companies,
  companiesBySlug,
  dailyDigest,
  getCompanyMomentum,
  homeTickerItems,
  launches,
  momentumEvents,
  momentumSnapshots,
  newsItemsBySlug,
  pastDigests,
  seedNow,
  sortedNewsItems,
  tags,
  timelineEntries,
  topMovers,
  trendingTopics,
  type CategoryAccent,
  type CompanyProfile,
  type HomeTickerItem,
  type LaunchCardData,
  type Milestone,
  type MomentumSnapshot,
  type NewsItem,
  type Partnership,
  type TimelineEntry,
  type TopMover,
  type TrendDirection,
} from "@/lib/seed/data";
import { getConfidenceLabel, getImportanceLabel } from "@/lib/utils";

type CompanyNewsRow = {
  company_id: string;
  news_item_id: string;
};

type NewsItemCategoryRow = {
  news_item_id: string;
  category_id: string;
};

type NewsItemTagRow = {
  news_item_id: string;
  tag_id: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
};

type TagRow = {
  id: string;
  slug: string;
  name: string;
};

type LaunchTypeMap = "MODEL" | "PRODUCT" | "PLATFORM" | "API";

function impactToScore(impact: NewsItem["impactDirection"]) {
  if (impact === "positive") {
    return 1;
  }

  if (impact === "negative") {
    return -1;
  }

  return 0;
}

function deriveCompanyEnrichment(companyNews: NewsItem[], momentum?: MomentumSnapshot): CompanyProfile["enrichmentData"] {
  if (companyNews.length === 0) {
    return undefined;
  }

  const sortedByDate = companyNews
    .slice()
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
  const categoryCounts = new Map<string, number>();
  const lastThirtyDays = companyNews.filter((item) => new Date(item.publishedAt) >= subDays(seedNow, 30));
  const sentimentHistory = eachDayOfInterval({
    start: subDays(seedNow, 29),
    end: seedNow,
  }).map((day) => {
    const label = format(day, "yyyy-MM-dd");
    const items = companyNews.filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === label);

    return {
      date: label,
      score: items.length > 0 ? Number((items.reduce((sum, item) => sum + impactToScore(item.impactDirection), 0) / items.length).toFixed(2)) : 0,
    };
  });

  companyNews.forEach((item) => {
    item.categorySlugs.forEach((slug) => {
      categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1);
    });
  });

  let activeStreak = 0;

  for (const day of eachDayOfInterval({ start: subDays(seedNow, 29), end: seedNow }).reverse()) {
    const label = format(day, "yyyy-MM-dd");
    const hasStory = companyNews.some((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === label);

    if (!hasStory) {
      break;
    }

    activeStreak += 1;
  }

  return {
    totalNewsCount: companyNews.length,
    avgImportanceScore:
      lastThirtyDays.length > 0
        ? Number((lastThirtyDays.reduce((sum, item) => sum + item.importanceScore, 0) / lastThirtyDays.length).toFixed(1))
        : Number((companyNews.reduce((sum, item) => sum + item.importanceScore, 0) / companyNews.length).toFixed(1)),
    topCategories: [...categoryCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([slug]) => categories.find((category) => category.slug === slug)?.name ?? slug),
    sentimentTrend:
      sentimentHistory.length > 0
        ? Number(
            (
              sentimentHistory.slice(-7).reduce((sum, item) => sum + item.score, 0) /
              Math.max(1, sentimentHistory.slice(-7).length)
            ).toFixed(2),
          )
        : 0,
    peakMomentumDate: momentum ? format(seedNow, "yyyy-MM-dd") : sortedByDate[0]?.publishedAt?.slice(0, 10) ?? format(seedNow, "yyyy-MM-dd"),
    activeStreak,
    sentimentHistory,
  };
}

function toTrendDirection(scoreChange7d: number): TrendDirection {
  if (scoreChange7d >= 4) {
    return "↑↑";
  }

  if (scoreChange7d > 0.35) {
    return "↑";
  }

  if (scoreChange7d <= -4) {
    return "↓↓";
  }

  if (scoreChange7d < -0.35) {
    return "↓";
  }

  return "→";
}

function launchTypeFromProductType(type: string): LaunchTypeMap {
  const normalized = type.toLowerCase();

  if (normalized.includes("api")) {
    return "API";
  }

  if (normalized.includes("platform") || normalized.includes("infrastructure")) {
    return "PLATFORM";
  }

  if (normalized.includes("model")) {
    return "MODEL";
  }

  return "PRODUCT";
}

function launchAccentFromType(type: LaunchTypeMap): LaunchCardData["accent"] {
  switch (type) {
    case "MODEL":
      return "green";
    case "API":
      return "blue";
    case "PLATFORM":
      return "amber";
    case "PRODUCT":
    default:
      return "purple";
  }
}

function mergeCompanyRow(companyRow: CompanyRow): CompanyProfile {
  const presentation = companiesBySlug[companyRow.slug];

  return {
    slug: companyRow.slug,
    name: companyRow.name,
    shortName: presentation?.shortName ?? companyRow.name,
    color: presentation?.color ?? "#4D9FFF",
    description: companyRow.description,
    overview: companyRow.overview,
    strengths: companyRow.strengths ?? presentation?.strengths ?? [],
    weaknesses: companyRow.weaknesses ?? presentation?.weaknesses ?? [],
    whyItMatters: companyRow.why_it_matters,
    valuationText: companyRow.valuation_text ?? presentation?.valuationText,
    websiteUrl: companyRow.website_url,
    tags: presentation?.tags ?? [],
    products: presentation?.products ?? [],
    partnerships: presentation?.partnerships ?? [],
    milestones: presentation?.milestones ?? [],
    sparkline: presentation?.sparkline ?? [0, 0, 0, 0, 0, 0, 0],
    enrichmentData: companyRow.enrichment_data ?? presentation?.enrichmentData,
  };
}

function fallbackCompanyCards(): CompanyCardRecord[] {
  return companies
    .map((company) => {
      const activityCount = sortedNewsItems.filter((item) => item.companySlugs.includes(company.slug)).length;
      const momentum = getCompanyMomentum(company.slug);

      return {
        company,
        activityCount,
        momentum,
      };
    })
    .sort((left, right) => (left.momentum?.rank ?? 999) - (right.momentum?.rank ?? 999));
}

function fallbackCompanyDetail(slug: string): CompanyDetailRecord | null {
  const company = companiesBySlug[slug];

  if (!company) {
    return null;
  }

  const companyNews = sortedNewsItems.filter((item) => item.companySlugs.includes(slug));
  const categoryBreakdown = categories
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      count: companyNews.filter((item) => item.categorySlugs.includes(category.slug)).length,
    }))
    .filter((item) => item.count > 0);

  return {
    company,
    momentum: getCompanyMomentum(slug),
    recentNews: companyNews.slice(0, 5),
    partnerships: company.partnerships,
    milestones: company.milestones,
    enrichment: company.enrichmentData ?? deriveCompanyEnrichment(companyNews, getCompanyMomentum(slug)),
    scoreBreakdown: momentumEvents
      .filter((event) => event.companySlug === slug)
      .map((event) => ({
        date: format(new Date(event.eventDate), "yyyy-MM-dd"),
        label: format(new Date(event.eventDate), "MMM d"),
        total: event.scoreDelta,
        eventType: event.eventType,
        scoreDelta: event.scoreDelta,
        explanation: event.explanation,
      })),
    categoryBreakdown,
  };
}

function fallbackDailyDigest(): DailyDigestRecord {
  return {
    digest: dailyDigest,
    topStories: dailyDigest.topStorySlugs.map((slug) => newsItemsBySlug[slug]).filter(Boolean),
    biggestWinnerMomentum: getCompanyMomentum(dailyDigest.biggestWinnerCompanySlug),
    biggestLoserMomentum: getCompanyMomentum(dailyDigest.biggestLoserCompanySlug),
    mostImportantStory: newsItemsBySlug[dailyDigest.mostImportantNewsSlug],
  };
}

function fallbackHomePage(): HomePageData {
  const latestPublishedAt = sortedNewsItems[0]?.publishedAt ?? seedNow.toISOString();

  return {
    todayStories: sortedNewsItems.filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === dailyDigest.date).slice(0, 5),
    breakingStories: sortedNewsItems.filter((item) => item.importanceLevel === "Critical").slice(0, 3),
    leaderboard: momentumSnapshots,
    launches,
    timeline: timelineEntries,
    topMovers,
    trendingTopics,
    digest: dailyDigest,
    tickerItems: homeTickerItems,
    stats: {
      totalStories: sortedNewsItems.length,
      totalCompanies: companies.length,
      totalLaunches: launches.length,
      lastUpdatedAt: latestPublishedAt,
      seedMode: true,
    },
  };
}

type SupabaseResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

async function runSupabaseQuery<T>(label: string, query: () => PromiseLike<SupabaseResult<T>>): Promise<T | null> {
  try {
    const { data, error } = await query();

    if (error) {
      console.error(`[db] ${label} query failed: ${error.message ?? "Unknown error"}`);
      return null;
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db] ${label} query threw: ${message}`);
    return null;
  }
}

const getCompanyRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("companies", () => client.from("companies").select("*").order("name"));
  return data as CompanyRow[] | null;
});

const getProductRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("company_products", () =>
    client.from("company_products").select("*").order("launch_date", { ascending: false }),
  );
  return data as CompanyProductRow[] | null;
});

const getNewsRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("news_items", () =>
    client.from("news_items").select("*").order("published_at", { ascending: false }),
  );
  return data as NewsItemRow[] | null;
});

const getCompanyNewsRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("company_news", () =>
    client.from("company_news").select("company_id, news_item_id"),
  );
  return data as CompanyNewsRow[] | null;
});

const getCategoryRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("categories", () => client.from("categories").select("id, slug, name"));
  return data as CategoryRow[] | null;
});

const getTagRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("tags", () => client.from("tags").select("id, slug, name"));
  return data as TagRow[] | null;
});

const getNewsCategoryRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("news_item_categories", () =>
    client.from("news_item_categories").select("news_item_id, category_id"),
  );
  return data as NewsItemCategoryRow[] | null;
});

const getNewsTagRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("news_item_tags", () =>
    client.from("news_item_tags").select("news_item_id, tag_id"),
  );
  return data as NewsItemTagRow[] | null;
});

const getEventRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("events", () =>
    client.from("events").select("*").order("event_date", { ascending: false }),
  );
  return data as EventRow[] | null;
});

const getMomentumRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("momentum_scores", () =>
    client.from("momentum_scores").select("*").order("calculated_at", { ascending: true }),
  );
  return data as MomentumScoreRow[] | null;
});

const getDailyDigestRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const data = await runSupabaseQuery("daily_digests", () =>
    client.from("daily_digests").select("*").order("digest_date", { ascending: false }),
  );
  return data as DailyDigestRow[] | null;
});

function buildNewsFromDatabase(
  newsRows: NewsItemRow[],
  companyRows: CompanyRow[],
  companyNewsRows: CompanyNewsRow[],
  categoryRows: CategoryRow[],
  newsCategoryRows: NewsItemCategoryRow[],
  tagRows: TagRow[],
  newsTagRows: NewsItemTagRow[],
) {
  const companyById = Object.fromEntries(companyRows.map((row) => [row.id, row]));
  const categoryById = Object.fromEntries(categoryRows.map((row) => [row.id, row]));
  const tagById = Object.fromEntries(tagRows.map((row) => [row.id, row]));

  const companySlugsByNewsId = new Map<string, string[]>();
  const categorySlugsByNewsId = new Map<string, string[]>();
  const tagSlugsByNewsId = new Map<string, string[]>();

  companyNewsRows.forEach((row) => {
    const current = companySlugsByNewsId.get(row.news_item_id) ?? [];
    const companySlug = companyById[row.company_id]?.slug;

    if (companySlug) {
      current.push(companySlug);
      companySlugsByNewsId.set(row.news_item_id, current);
    }
  });

  newsCategoryRows.forEach((row) => {
    const current = categorySlugsByNewsId.get(row.news_item_id) ?? [];
    const categorySlug = categoryById[row.category_id]?.slug;

    if (categorySlug) {
      current.push(categorySlug);
      categorySlugsByNewsId.set(row.news_item_id, current);
    }
  });

  newsTagRows.forEach((row) => {
    const current = tagSlugsByNewsId.get(row.news_item_id) ?? [];
    const tagSlug = tagById[row.tag_id]?.slug;

    if (tagSlug) {
      current.push(tagSlug);
      tagSlugsByNewsId.set(row.news_item_id, current);
    }
  });

  return newsRows.map<NewsItem>((row) => ({
    slug: row.slug,
    headline: row.headline,
    sourceName: row.source_name,
    sourceUrl: row.canonical_url ?? row.source_url,
    publishedAt: row.published_at,
    summary: row.summary,
    shortSummary: row.short_summary,
    whyItMatters: row.why_it_matters,
    summarizerModel: row.summarizer_model ?? undefined,
    importanceScore: row.importance_score,
    importanceLevel: getImportanceLabel(row.importance_score) as NewsItem["importanceLevel"],
    confidenceScore: row.confidence_score,
    confidenceLevel: getConfidenceLabel(row.confidence_score) as NewsItem["confidenceLevel"],
    impactDirection: row.impact_direction,
    companySlugs: companySlugsByNewsId.get(row.id) ?? [],
    categorySlugs: categorySlugsByNewsId.get(row.id) ?? [],
    tagSlugs: tagSlugsByNewsId.get(row.id) ?? [],
    breaking: row.importance_score >= 9,
  }));
}

function buildMomentumSnapshotsFromDatabase(
  companyRows: CompanyRow[],
  momentumRows: MomentumScoreRow[],
  eventRows: EventRow[],
  newsRows: NewsItemRow[],
) {
  const historyByCompanyId = new Map<string, MomentumScoreRow[]>();
  const eventsByCompanyId = new Map<string, EventRow[]>();
  const newsById = Object.fromEntries(newsRows.map((row) => [row.id, row]));

  momentumRows.forEach((row) => {
    const current = historyByCompanyId.get(row.company_id) ?? [];
    current.push(row);
    historyByCompanyId.set(row.company_id, current);
  });

  eventRows.forEach((row) => {
    const current = eventsByCompanyId.get(row.company_id) ?? [];
    current.push(row);
    eventsByCompanyId.set(row.company_id, current);
  });

  const snapshots = companyRows.map<MomentumSnapshot>((companyRow) => {
    const fallback = getCompanyMomentum(companyRow.slug);
    const history = historyByCompanyId.get(companyRow.id) ?? [];
    const latest = history.at(-1);
    const leadingEvent = (eventsByCompanyId.get(companyRow.id) ?? [])[0];
    const leadingNewsSlug = leadingEvent?.news_item_id ? newsById[leadingEvent.news_item_id]?.slug : undefined;

    return {
      companySlug: companyRow.slug,
      rank: 0,
      score: Number(latest?.score ?? fallback?.score ?? 0),
      scoreChange24h: Number(latest?.score_change_24h ?? fallback?.scoreChange24h ?? 0),
      scoreChange7d: Number(latest?.score_change_7d ?? fallback?.scoreChange7d ?? 0),
      trend: toTrendDirection(Number(latest?.score_change_7d ?? fallback?.scoreChange7d ?? 0)),
      keyDriver: leadingEvent?.explanation ?? fallback?.keyDriver ?? "Recent activity",
      sparkline:
        history.length > 0
          ? history.slice(-7).map((row) => Number(row.score))
          : fallback?.sparkline ?? companiesBySlug[companyRow.slug]?.sparkline ?? [0, 0, 0, 0, 0, 0, 0],
      driverNewsSlugs: leadingNewsSlug ? [leadingNewsSlug] : fallback?.driverNewsSlugs ?? [],
    };
  });

  return snapshots
    .sort((left, right) => right.score - left.score)
    .map((snapshot, index) => ({
      ...snapshot,
      rank: index + 1,
    }));
}

export const getNewsItemsData = cache(async (): Promise<NewsItem[]> => {
  const [companyRows, newsRows, companyNewsRows, categoryRows, newsCategoryRows, tagRows, newsTagRows] =
    await Promise.all([
      getCompanyRows(),
      getNewsRows(),
      getCompanyNewsRows(),
      getCategoryRows(),
      getNewsCategoryRows(),
      getTagRows(),
      getNewsTagRows(),
    ]);

  if (
    !companyRows ||
    !newsRows ||
    !companyNewsRows ||
    !categoryRows ||
    !newsCategoryRows ||
    !tagRows ||
    !newsTagRows
  ) {
    return sortedNewsItems;
  }

  return buildNewsFromDatabase(newsRows, companyRows, companyNewsRows, categoryRows, newsCategoryRows, tagRows, newsTagRows);
});

export const getNewsItemDetailData = cache(async (slug: string): Promise<NewsDetailRecord | null> => {
  const news = await getNewsItemsData();
  const newsItem = news.find((item) => item.slug === slug);

  if (!newsItem) {
    return null;
  }

  const relatedStories = news
    .filter((item) => item.slug !== slug)
    .filter((item) => item.companySlugs.some((companySlug) => newsItem.companySlugs.includes(companySlug)))
    .sort(
      (left, right) =>
        right.importanceScore - left.importanceScore ||
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    )
    .slice(0, 3);
  const moreFromCompany = news
    .filter((item) => item.slug !== slug)
    .filter((item) => item.companySlugs.some((companySlug) => newsItem.companySlugs.includes(companySlug)))
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, 3);

  return {
    news: newsItem,
    relatedStories,
    moreFromCompany,
  };
});

export const getLeaderboardData = cache(async (): Promise<MomentumSnapshot[]> => {
  const [companyRows, momentumRows, eventRows, newsRows] = await Promise.all([
    getCompanyRows(),
    getMomentumRows(),
    getEventRows(),
    getNewsRows(),
  ]);

  if (!companyRows || !momentumRows || !eventRows || !newsRows) {
    return momentumSnapshots;
  }

  return buildMomentumSnapshotsFromDatabase(companyRows, momentumRows, eventRows, newsRows);
});

export const getCompaniesIndexData = cache(async (): Promise<CompanyCardRecord[]> => {
  const [companyRows, newsItems, leaderboard] = await Promise.all([
    getCompanyRows(),
    getNewsItemsData(),
    getLeaderboardData(),
  ]);

  if (!companyRows) {
    return fallbackCompanyCards();
  }

  const momentumBySlug = Object.fromEntries(leaderboard.map((row) => [row.companySlug, row]));

  return companyRows
    .map((row) => {
      const company = mergeCompanyRow(row);

      return {
        company,
        activityCount: newsItems.filter((item) => item.companySlugs.includes(row.slug)).length,
        momentum: momentumBySlug[row.slug],
      };
    })
    .sort((left, right) => (left.momentum?.rank ?? 999) - (right.momentum?.rank ?? 999));
});

export const getLaunchesData = cache(async (): Promise<LaunchCardData[]> => {
  const [companyRows, productRows] = await Promise.all([getCompanyRows(), getProductRows()]);

  if (!companyRows || !productRows) {
    return launches;
  }

  const companyById = Object.fromEntries(companyRows.map((row) => [row.id, row]));

  const recentLaunches = productRows
    .filter((row) => row.launch_date)
    .sort((left, right) => new Date(right.launch_date ?? "").getTime() - new Date(left.launch_date ?? "").getTime())
    .slice(0, 6)
    .map<LaunchCardData>((row) => {
      const seedLaunch = launches.find((launch) => launch.name === row.name);
      const companySlug = companyById[row.company_id]?.slug ?? seedLaunch?.companySlug ?? "openai";
      const type = seedLaunch?.type ?? launchTypeFromProductType(row.type);

      return {
        slug: row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type,
        name: row.name,
        companySlug,
        description: row.description,
        launchDate: row.launch_date ?? seedNow.toISOString(),
        accent: seedLaunch?.accent ?? launchAccentFromType(type),
      };
    });

  return recentLaunches.length > 0 ? recentLaunches : launches;
});

export const getTimelineData = cache(async (): Promise<TimelineEntry[]> => {
  const news = await getNewsItemsData();

  const generatedTimeline = news
    .filter((item) => item.importanceScore >= 6 && item.companySlugs.length > 0)
    .slice(0, 10)
    .map<TimelineEntry>((item, index) => ({
      slug: `timeline-${item.slug}`,
      companySlug: item.companySlugs[0],
      timestamp: item.publishedAt,
      headline: item.headline,
      detail: item.shortSummary || item.whyItMatters,
      live: index === 0,
    }));

  return generatedTimeline.length > 0 ? generatedTimeline : timelineEntries;
});

export const getTopMoversData = cache(async (): Promise<TopMover[]> => {
  const leaderboard = await getLeaderboardData();

  if (leaderboard === momentumSnapshots || leaderboard.length === 0) {
    return topMovers;
  }

  const biggestGainer = [...leaderboard].sort((left, right) => right.scoreChange24h - left.scoreChange24h)[0];
  const biggestDrop = [...leaderboard].sort((left, right) => left.scoreChange24h - right.scoreChange24h)[0];

  if (!biggestGainer || !biggestDrop) {
    return topMovers;
  }

  const watchCandidate =
    leaderboard
      .filter((row) => row.companySlug !== biggestGainer?.companySlug && row.companySlug !== biggestDrop?.companySlug)
      .sort((left, right) => right.scoreChange7d - left.scoreChange7d)[0] ?? leaderboard[0];

  return [
    {
      label: "Biggest Gainer",
      companySlug: biggestGainer.companySlug,
      delta: biggestGainer.scoreChange24h,
      reason: biggestGainer.keyDriver,
      accent: "green",
      chart: biggestGainer.sparkline,
    },
    {
      label: "Biggest Drop",
      companySlug: biggestDrop.companySlug,
      delta: biggestDrop.scoreChange24h,
      reason: biggestDrop.keyDriver,
      accent: "red",
      chart: biggestDrop.sparkline,
    },
    {
      label: "One To Watch",
      companySlug: watchCandidate.companySlug,
      delta: watchCandidate.scoreChange7d,
      reason: watchCandidate.keyDriver,
      accent: "purple",
      chart: watchCandidate.sparkline,
    },
  ];
});

export const getCompanyDetailData = cache(async (slug: string): Promise<CompanyDetailRecord | null> => {
  const [companyRows, productRows, news, leaderboard, eventRows] = await Promise.all([
    getCompanyRows(),
    getProductRows(),
    getNewsItemsData(),
    getLeaderboardData(),
    getEventRows(),
  ]);

  if (!companyRows || !productRows || !eventRows) {
    return fallbackCompanyDetail(slug);
  }

  const companyRow = companyRows.find((row) => row.slug === slug);

  if (!companyRow) {
    return fallbackCompanyDetail(slug);
  }

  try {
    const company = mergeCompanyRow(companyRow);
    company.products = productRows
      .filter((row) => row.company_id === companyRow.id)
      .map((row) => ({
        name: row.name,
        type: row.type,
        description: row.description,
        launchDate: row.launch_date ?? undefined,
      }));

    const recentNews = news.filter((item) => item.companySlugs.includes(slug)).slice(0, 5);
    const companyNews = news.filter((item) => item.companySlugs.includes(slug));
    const categoryBreakdown = categories
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        count: companyNews.filter((item) => item.categorySlugs.includes(category.slug)).length,
      }))
      .filter((item) => item.count > 0);
    const partnerships = recentNews
      .filter((item) => item.categorySlugs.includes("partnership"))
      .slice(0, 2)
      .map<Partnership>((item) => ({
        name: item.headline,
        detail: item.summary,
      }));

    const milestones = eventRows
      .filter((row) => row.company_id === companyRow.id)
      .slice(0, 4)
      .map<Milestone>((row) => ({
        date: format(new Date(row.event_date), "yyyy-MM-dd"),
        title: row.event_type,
        detail: row.explanation,
      }));
    const scoreBreakdown = eventRows
      .filter((row) => row.company_id === companyRow.id)
      .slice()
      .sort((left, right) => new Date(left.event_date).getTime() - new Date(right.event_date).getTime())
      .map((row) => ({
        date: format(new Date(row.event_date), "yyyy-MM-dd"),
        label: format(new Date(row.event_date), "MMM d"),
        total: row.score_delta,
        eventType: row.event_type,
        scoreDelta: row.score_delta,
        explanation: row.explanation,
      }));

    return {
      company,
      momentum: leaderboard.find((row) => row.companySlug === slug),
      recentNews,
      partnerships: partnerships.length > 0 ? partnerships : companiesBySlug[slug]?.partnerships ?? [],
      milestones: milestones.length > 0 ? milestones : companiesBySlug[slug]?.milestones ?? [],
      enrichment: company.enrichmentData ?? deriveCompanyEnrichment(companyNews, leaderboard.find((row) => row.companySlug === slug)),
      scoreBreakdown,
      categoryBreakdown,
    };
  } catch (error) {
    console.error(`[db] getCompanyDetailData processing failed for ${slug}:`, error);
    return fallbackCompanyDetail(slug);
  }
});

export const getDailyDigestData = cache(async (targetDate = dailyDigest.date): Promise<DailyDigestRecord> => {
  const [digestRows, companyRows, news, leaderboard, newsRows] = await Promise.all([
    getDailyDigestRows(),
    getCompanyRows(),
    getNewsItemsData(),
    getLeaderboardData(),
    getNewsRows(),
  ]);

  if (!digestRows || !companyRows || !newsRows) {
    return fallbackDailyDigest();
  }

  const digestRow =
    digestRows.find((row) => row.digest_date === targetDate) ??
    digestRows.sort((left, right) => new Date(right.digest_date).getTime() - new Date(left.digest_date).getTime())[0];

  if (!digestRow) {
    return fallbackDailyDigest();
  }

  const companyById = Object.fromEntries(companyRows.map((row) => [row.id, row]));
  const newsSlugById = Object.fromEntries(newsRows.map((row) => [row.id, row.slug]));
  const inferredTopStories = news
    .filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === digestRow.digest_date)
    .sort((left, right) => right.importanceScore - left.importanceScore || new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, 10);

  const winnerSlug = companyById[digestRow.biggest_winner_company_id]?.slug ?? dailyDigest.biggestWinnerCompanySlug;
  const loserSlug = companyById[digestRow.biggest_loser_company_id]?.slug ?? dailyDigest.biggestLoserCompanySlug;
  const mostImportantSlug = digestRow.most_important_news_item_id
    ? newsSlugById[digestRow.most_important_news_item_id]
    : undefined;
  const digestTopStorySlugs = digestRow.top_story_slugs?.length ? digestRow.top_story_slugs : inferredTopStories.map((item) => item.slug);
  const topStories = digestTopStorySlugs.map((slug) => news.find((item) => item.slug === slug)).filter(Boolean) as typeof news;
  const mostImportantStory =
    news.find((item) => item.slug === mostImportantSlug) ??
    topStories[0] ??
    inferredTopStories[0] ??
    newsItemsBySlug[dailyDigest.mostImportantNewsSlug];
  const fallbackDigest = fallbackDailyDigest();

  if (!mostImportantStory) {
    return fallbackDigest;
  }

  const resolvedTopStories =
    topStories.length > 0 ? topStories : inferredTopStories.length > 0 ? inferredTopStories : fallbackDigest.topStories;
  const resolvedTopStorySlugs = digestTopStorySlugs.length > 0 ? digestTopStorySlugs : fallbackDigest.digest.topStorySlugs;

  return {
    digest: {
      date: digestRow.digest_date,
      title: digestRow.title,
      summary: digestRow.summary,
      narrative: digestRow.narrative ?? dailyDigest.narrative,
      headlineOfTheDay: digestRow.headline_of_the_day ?? dailyDigest.headlineOfTheDay,
      themes: digestRow.themes?.length ? digestRow.themes : dailyDigest.themes,
      biggestWinnerCompanySlug: winnerSlug,
      biggestLoserCompanySlug: loserSlug,
      mostImportantNewsSlug: mostImportantStory.slug,
      topStorySlugs: resolvedTopStorySlugs,
      watchNext: digestRow.watch_next?.length ? digestRow.watch_next : dailyDigest.watchNext,
    },
    topStories: resolvedTopStories,
    biggestWinnerMomentum: leaderboard.find((row) => row.companySlug === winnerSlug),
    biggestLoserMomentum: leaderboard.find((row) => row.companySlug === loserSlug),
    mostImportantStory,
  };
});

export const getDailyDigestByDate = cache(async (date: string): Promise<DailyDigestRecord> => {
  const client = getSupabaseServerClient();

  if (client) {
    const result = await getDailyDigestData(date);

    return result;
  }

  if (date === dailyDigest.date) {
    return fallbackDailyDigest();
  }

  const pastMatch = pastDigests.find((d) => d.date === date);
  const digestSource = pastMatch ?? { ...dailyDigest, date };

  return {
    digest: digestSource,
    topStories: digestSource.topStorySlugs.map((slug) => newsItemsBySlug[slug]).filter(Boolean),
    biggestWinnerMomentum: getCompanyMomentum(digestSource.biggestWinnerCompanySlug),
    biggestLoserMomentum: getCompanyMomentum(digestSource.biggestLoserCompanySlug),
    mostImportantStory: newsItemsBySlug[digestSource.mostImportantNewsSlug],
  };
});

export const getDigestArchiveDates = cache(async (): Promise<string[]> => {
  const client = getSupabaseServerClient();

  if (client) {
    const { data } = await client
      .from("daily_digests")
      .select("digest_date")
      .order("digest_date", { ascending: false })
      .limit(7);

    if (data && data.length > 0) {
      return (data as Array<{ digest_date: string }>).map((row) => row.digest_date);
    }
  }

  const allDates = [dailyDigest.date, ...pastDigests.map((d) => d.date)];
  const sorted = [...new Set(allDates)].sort((a, b) => b.localeCompare(a));

  return sorted.slice(0, 7);
});

export const getRecentMomentumEventsData = cache(async () => {
  const [companyRows, eventRows, newsRows] = await Promise.all([getCompanyRows(), getEventRows(), getNewsRows()]);

  if (!companyRows || !eventRows || !newsRows) {
    return momentumEvents.slice(0, 10).map((event) => ({
      companySlug: event.companySlug,
      eventType: event.eventType,
      scoreDelta: event.scoreDelta,
      explanation: event.explanation,
      headline: newsItemsBySlug[event.newsSlug]?.headline ?? event.eventType,
    }));
  }

  const companyById = Object.fromEntries(companyRows.map((row) => [row.id, row]));
  const newsById = Object.fromEntries(newsRows.map((row) => [row.id, row]));

  return eventRows.slice(0, 10).map((row) => ({
    companySlug: companyById[row.company_id]?.slug ?? "openai",
    eventType: row.event_type,
    scoreDelta: row.score_delta,
    explanation: row.explanation,
    headline: row.news_item_id ? newsById[row.news_item_id]?.headline ?? row.event_type : row.event_type,
  }));
});

export const getHomePageData = cache(async (): Promise<HomePageData> => {
  const [news, leaderboard, launchData, timeline, movers] = await Promise.all([
    getNewsItemsData(),
    getLeaderboardData(),
    getLaunchesData(),
    getTimelineData(),
    getTopMoversData(),
  ]);

  if (news === sortedNewsItems && leaderboard === momentumSnapshots && launchData === launches) {
    return fallbackHomePage();
  }

  const todayStories = news
    .filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === dailyDigest.date)
    .slice(0, 5);
  const latestPublishedAt = news[0]?.publishedAt ?? seedNow.toISOString();

  const seenCompanies = new Map<string, number>();
  const dynamicTickerItems: HomeTickerItem[] = [];

  for (const item of news) {
    const companyKey = item.companySlugs[0] ?? "ai";
    const companyCount = seenCompanies.get(companyKey) ?? 0;

    if (companyCount >= 2) {
      continue;
    }

    seenCompanies.set(companyKey, companyCount + 1);
    const tone: CategoryAccent =
      item.impactDirection === "positive" ? "green" : item.impactDirection === "negative" ? "red" : "neutral";

    dynamicTickerItems.push({
      slug: item.slug,
      company: companyKey.toUpperCase(),
      direction: item.impactDirection === "positive" ? "↑" : item.impactDirection === "negative" ? "↓" : "→",
      tone,
      text: item.headline.length > 40 ? item.headline.slice(0, 37) + "..." : item.headline,
    });

    if (dynamicTickerItems.length >= 12) {
      break;
    }
  }

  const tickerItems = dynamicTickerItems.length >= 6 ? dynamicTickerItems : homeTickerItems;

  return {
    todayStories: todayStories.length > 0 ? todayStories : news.slice(0, 5),
    breakingStories: news.filter((item) => item.importanceLevel === "Critical").slice(0, 3),
    leaderboard,
    launches: launchData,
    timeline,
    topMovers: movers,
    trendingTopics,
    digest: (await getDailyDigestData()).digest,
    tickerItems,
    stats: {
      totalStories: news.length,
      totalCompanies: companies.length,
      totalLaunches: launchData.length,
      lastUpdatedAt: latestPublishedAt,
      seedMode: false,
    },
  };
});

/* ------------------------------------------------------------------ */
/*  Trending Topics                                                   */
/* ------------------------------------------------------------------ */

export type TrendingTag = {
  slug: string;
  name: string;
  count: number;
  trend: "up" | "down" | "stable";
  topStories: NewsItem[];
};

function fallbackTrendingTopics(): TrendingTag[] {
  const tagCountMap = new Map<string, { count: number; stories: NewsItem[] }>();

  for (const item of sortedNewsItems) {
    for (const tagSlug of item.tagSlugs) {
      const entry = tagCountMap.get(tagSlug) ?? { count: 0, stories: [] };
      entry.count += 1;

      if (entry.stories.length < 3) {
        entry.stories.push(item);
      }

      tagCountMap.set(tagSlug, entry);
    }
  }

  const tagLookup = Object.fromEntries(tags.map((tag) => [tag.slug, tag.name]));
  const hotSlugs = new Set(
    trendingTopics
      .filter((topic) => topic.hot)
      .map((topic) => {
        const match = tags.find(
          (tag) =>
            tag.name.toLowerCase() === topic.label.toLowerCase() ||
            topic.label.toLowerCase().includes(tag.name.toLowerCase()),
        );
        return match?.slug;
      })
      .filter(Boolean) as string[],
  );

  return [...tagCountMap.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 20)
    .map<TrendingTag>(([slug, data]) => ({
      slug,
      name: tagLookup[slug] ?? slug,
      count: data.count,
      trend: hotSlugs.has(slug) ? "up" : data.count >= 4 ? "up" : data.count <= 1 ? "down" : "stable",
      topStories: data.stories,
    }));
}

export const getTrendingTopicsData = cache(async (): Promise<TrendingTag[]> => {
  const [newsRows, companyRows, companyNewsRows, categoryRows, newsCategoryRows, tagRows, newsTagRows] =
    await Promise.all([
      getNewsRows(),
      getCompanyRows(),
      getCompanyNewsRows(),
      getCategoryRows(),
      getNewsCategoryRows(),
      getTagRows(),
      getNewsTagRows(),
    ]);

  if (
    !newsRows ||
    !companyRows ||
    !companyNewsRows ||
    !categoryRows ||
    !newsCategoryRows ||
    !tagRows ||
    !newsTagRows
  ) {
    return fallbackTrendingTopics();
  }

  const sevenDaysAgo = subDays(new Date(), 7);
  const recentNewsRows = newsRows.filter((row) => new Date(row.published_at) >= sevenDaysAgo);
  const recentNews = buildNewsFromDatabase(
    recentNewsRows.length > 0 ? recentNewsRows : newsRows,
    companyRows,
    companyNewsRows,
    categoryRows,
    newsCategoryRows,
    tagRows,
    newsTagRows,
  );

  const tagCountMap = new Map<string, { count: number; stories: NewsItem[] }>();

  for (const item of recentNews) {
    for (const tagSlug of item.tagSlugs) {
      const entry = tagCountMap.get(tagSlug) ?? { count: 0, stories: [] };
      entry.count += 1;

      if (entry.stories.length < 3) {
        entry.stories.push(item);
      }

      tagCountMap.set(tagSlug, entry);
    }
  }

  const tagLookup = Object.fromEntries(tagRows.map((row) => [row.slug, row.name]));

  return [...tagCountMap.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 20)
    .map<TrendingTag>(([slug, data]) => ({
      slug,
      name: tagLookup[slug] ?? slug,
      count: data.count,
      trend: data.count >= 4 ? "up" : data.count <= 1 ? "down" : "stable",
      topStories: data.stories,
    }));
});

/* ------------------------------------------------------------------ */
/*  Heatmap                                                           */
/* ------------------------------------------------------------------ */

export const getHeatmapData = cache(async (): Promise<HeatmapData> => {
  const [companyRows, eventRows] = await Promise.all([getCompanyRows(), getEventRows()]);

  if (!companyRows || !eventRows) {
    const dates = eachDayOfInterval({
      start: subDays(seedNow, 29),
      end: seedNow,
    }).map((day) => format(day, "yyyy-MM-dd"));

    const heatmapCompanies = companies.map((c) => ({
      slug: c.slug,
      name: c.name,
      color: c.color,
    }));

    const cells: HeatmapCell[] = [];

    for (const company of heatmapCompanies) {
      for (const date of dates) {
        const dayEvents = momentumEvents.filter(
          (event) =>
            event.companySlug === company.slug &&
            format(new Date(event.eventDate), "yyyy-MM-dd") === date,
        );

        cells.push({
          companySlug: company.slug,
          companyName: company.name,
          companyColor: company.color,
          date,
          eventCount: dayEvents.length,
          netScore: dayEvents.reduce((sum, event) => sum + event.scoreDelta, 0),
          events: dayEvents.map((event) => ({
            eventType: event.eventType,
            scoreDelta: event.scoreDelta,
            explanation: event.explanation,
          })),
        });
      }
    }

    return { cells, dates, companies: heatmapCompanies, lastUpdatedAt: seedNow.toISOString() };
  }

  const today = startOfDay(new Date());
  const dates = eachDayOfInterval({
    start: subDays(today, 29),
    end: today,
  }).map((day) => format(day, "yyyy-MM-dd"));

  const heatmapCompanies = companyRows.map((row) => {
    const company = mergeCompanyRow(row);
    return { slug: company.slug, name: company.name, color: company.color };
  });

  const companyById = new Map(companyRows.map((row) => [row.id, row]));
  const cells: HeatmapCell[] = [];
  const cellLookup = new Map<string, HeatmapCell>();

  for (const company of heatmapCompanies) {
    for (const date of dates) {
      const cell: HeatmapCell = {
        companySlug: company.slug,
        companyName: company.name,
        companyColor: company.color,
        date,
        eventCount: 0,
        netScore: 0,
        events: [],
      };

      cells.push(cell);
      cellLookup.set(`${company.slug}::${date}`, cell);
    }
  }

  const dateSet = new Set(dates);

  for (const event of eventRows) {
    const companyRow = companyById.get(event.company_id);
    if (!companyRow) {
      continue;
    }

    const dateKey = format(new Date(event.event_date), "yyyy-MM-dd");
    if (!dateSet.has(dateKey)) {
      continue;
    }

    const cell = cellLookup.get(`${companyRow.slug}::${dateKey}`);
    if (!cell) {
      continue;
    }

    cell.eventCount += 1;
    cell.netScore += Number(event.score_delta ?? 0);
    cell.events.push({
      eventType: event.event_type,
      scoreDelta: event.score_delta,
      explanation: event.explanation,
    });
  }

  const lastUpdatedAt = eventRows[0]?.event_date ?? new Date().toISOString();

  return { cells, dates, companies: heatmapCompanies, lastUpdatedAt };
});

/* ------------------------------------------------------------------ */
/*  Full Timeline                                                      */
/* ------------------------------------------------------------------ */

export type FullTimelineData = {
  entries: TimelineEntry[];
  newsItems: NewsItem[];
  companies: Array<{ slug: string; name: string; color: string }>;
  lastUpdatedAt: string;
};

export const getFullTimelineData = cache(async (days: number): Promise<FullTimelineData> => {
  const [companyRows, eventRows, newsRows, newsItems] = await Promise.all([
    getCompanyRows(),
    getEventRows(),
    getNewsRows(),
    getNewsItemsData(),
  ]);

  if (!companyRows || !eventRows || !newsRows) {
    const cutoff = subDays(seedNow, days);

    const entries = timelineEntries.filter(
      (entry) => new Date(entry.timestamp) >= cutoff,
    );

    const news = sortedNewsItems.filter(
      (item) => new Date(item.publishedAt) >= cutoff,
    );

    const timelineCompanies = companies.map((c) => ({
      slug: c.slug,
      name: c.name,
      color: c.color,
    }));

    return { entries, newsItems: news, companies: timelineCompanies, lastUpdatedAt: seedNow.toISOString() };
  }

  const cutoff = subDays(new Date(), days);
  const companyById = new Map(companyRows.map((row) => [row.id, row]));
  const newsById = new Map(newsRows.map((row) => [row.id, row]));

  const timelineCompanies = companyRows.map((row) => {
    const company = mergeCompanyRow(row);
    return { slug: company.slug, name: company.name, color: company.color };
  });

  const entries = eventRows
    .filter((row) => new Date(row.event_date) >= cutoff)
    .map<TimelineEntry | null>((row) => {
      const companyRow = companyById.get(row.company_id);
      if (!companyRow) {
        return null;
      }

      const newsRow = row.news_item_id ? newsById.get(row.news_item_id) : undefined;
      const headline = newsRow?.headline ?? row.event_type;
      const detail = newsRow?.short_summary ?? newsRow?.summary ?? row.explanation;
      const timestamp = row.event_date ?? newsRow?.published_at ?? new Date().toISOString();

      return {
        slug: `timeline-${newsRow?.slug ?? row.id}`,
        companySlug: companyRow.slug,
        timestamp,
        headline,
        detail,
        live: false,
      };
    })
    .filter((entry): entry is TimelineEntry => Boolean(entry))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  if (entries.length > 0) {
    entries[0].live = true;
  }

  const newsInRange = newsItems.filter((item) => new Date(item.publishedAt) >= cutoff);

  const lastUpdatedAt = entries[0]?.timestamp ?? newsInRange[0]?.publishedAt ?? new Date().toISOString();

  return { entries, newsItems: newsInRange, companies: timelineCompanies, lastUpdatedAt };
});
