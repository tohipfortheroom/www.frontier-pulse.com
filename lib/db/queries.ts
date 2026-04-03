import { cache } from "react";
import { format } from "date-fns";

import { getSupabaseServerClient } from "@/lib/db/client";
import type {
  CompanyCardRecord,
  CompanyDetailRecord,
  CompanyProductRow,
  CompanyRow,
  DailyDigestRecord,
  DailyDigestRow,
  EventRow,
  HomePageData,
  MomentumScoreRow,
  NewsItemRow,
} from "@/lib/db/types";
import {
  companies,
  companiesBySlug,
  dailyDigest,
  getCompanyMomentum,
  launches,
  momentumEvents,
  momentumSnapshots,
  newsItemsBySlug,
  seedNow,
  sortedNewsItems,
  timelineEntries,
  topMovers,
  trendingTopics,
  type CompanyProfile,
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

  return {
    company,
    momentum: getCompanyMomentum(slug),
    recentNews: sortedNewsItems.filter((item) => item.companySlugs.includes(slug)).slice(0, 5),
    partnerships: company.partnerships,
    milestones: company.milestones,
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
  return {
    todayStories: sortedNewsItems.filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === dailyDigest.date).slice(0, 5),
    breakingStories: sortedNewsItems.filter((item) => item.importanceLevel === "Critical").slice(0, 3),
    leaderboard: momentumSnapshots,
    launches,
    timeline: timelineEntries,
    topMovers,
    trendingTopics,
    digest: dailyDigest,
  };
}

const getCompanyRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("companies").select("*").order("name");

  if (error || !data) {
    return null;
  }

  return data as CompanyRow[];
});

const getProductRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("company_products").select("*").order("launch_date", { ascending: false });

  if (error || !data) {
    return null;
  }

  return data as CompanyProductRow[];
});

const getNewsRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("news_items").select("*").order("published_at", { ascending: false });

  if (error || !data) {
    return null;
  }

  return data as NewsItemRow[];
});

const getCompanyNewsRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("company_news").select("company_id, news_item_id");

  if (error || !data) {
    return null;
  }

  return data as CompanyNewsRow[];
});

const getCategoryRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("categories").select("id, slug, name");

  if (error || !data) {
    return null;
  }

  return data as CategoryRow[];
});

const getTagRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("tags").select("id, slug, name");

  if (error || !data) {
    return null;
  }

  return data as TagRow[];
});

const getNewsCategoryRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("news_item_categories").select("news_item_id, category_id");

  if (error || !data) {
    return null;
  }

  return data as NewsItemCategoryRow[];
});

const getNewsTagRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("news_item_tags").select("news_item_id, tag_id");

  if (error || !data) {
    return null;
  }

  return data as NewsItemTagRow[];
});

const getEventRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("events").select("*").order("event_date", { ascending: false });

  if (error || !data) {
    return null;
  }

  return data as EventRow[];
});

const getMomentumRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("momentum_scores").select("*").order("calculated_at", { ascending: true });

  if (error || !data) {
    return null;
  }

  return data as MomentumScoreRow[];
});

const getDailyDigestRows = cache(async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("daily_digests").select("*").order("digest_date", { ascending: false });

  if (error || !data) {
    return null;
  }

  return data as DailyDigestRow[];
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
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    summary: row.summary,
    shortSummary: row.short_summary,
    whyItMatters: row.why_it_matters,
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

  if (leaderboard === momentumSnapshots) {
    return topMovers;
  }

  const biggestGainer = [...leaderboard].sort((left, right) => right.scoreChange24h - left.scoreChange24h)[0];
  const biggestDrop = [...leaderboard].sort((left, right) => left.scoreChange24h - right.scoreChange24h)[0];
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
    return null;
  }

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

  return {
    company,
    momentum: leaderboard.find((row) => row.companySlug === slug),
    recentNews,
    partnerships: partnerships.length > 0 ? partnerships : companiesBySlug[slug]?.partnerships ?? [],
    milestones: milestones.length > 0 ? milestones : companiesBySlug[slug]?.milestones ?? [],
  };
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
  const topStories = news
    .filter((item) => format(new Date(item.publishedAt), "yyyy-MM-dd") === digestRow.digest_date)
    .sort((left, right) => right.importanceScore - left.importanceScore || new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, 10);

  const winnerSlug = companyById[digestRow.biggest_winner_company_id]?.slug ?? dailyDigest.biggestWinnerCompanySlug;
  const loserSlug = companyById[digestRow.biggest_loser_company_id]?.slug ?? dailyDigest.biggestLoserCompanySlug;
  const mostImportantSlug = digestRow.most_important_news_item_id
    ? newsSlugById[digestRow.most_important_news_item_id]
    : undefined;
  const mostImportantStory =
    news.find((item) => item.slug === mostImportantSlug) ??
    topStories[0] ??
    newsItemsBySlug[dailyDigest.mostImportantNewsSlug];

  return {
    digest: {
      date: digestRow.digest_date,
      title: digestRow.title,
      summary: digestRow.summary,
      biggestWinnerCompanySlug: winnerSlug,
      biggestLoserCompanySlug: loserSlug,
      mostImportantNewsSlug: mostImportantStory.slug,
      topStorySlugs: topStories.map((item) => item.slug),
      watchNext: dailyDigest.watchNext,
    },
    topStories: topStories.length > 0 ? topStories : fallbackDailyDigest().topStories,
    biggestWinnerMomentum: leaderboard.find((row) => row.companySlug === winnerSlug),
    biggestLoserMomentum: leaderboard.find((row) => row.companySlug === loserSlug),
    mostImportantStory,
  };
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

  return {
    todayStories: todayStories.length > 0 ? todayStories : news.slice(0, 5),
    breakingStories: news.filter((item) => item.importanceLevel === "Critical").slice(0, 3),
    leaderboard,
    launches: launchData,
    timeline,
    topMovers: movers,
    trendingTopics,
    digest: (await getDailyDigestData()).digest,
  };
});
