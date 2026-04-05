import { format, subHours } from "date-fns";

import { BRAND_DIGEST_NAME, BRAND_NAME } from "../brand.ts";
import { getSupabaseServiceClient } from "../db/client.ts";
import { extractFirstJsonObject } from "../llm/json.ts";
import { generateLlmText, isLlmConfigured } from "../llm/openai.ts";
import { logger } from "../monitoring/logger.ts";
import { dailyDigest, newsItemsBySlug } from "../seed/data.ts";

type DigestDraft = {
  summary: string;
  topStorySlugs: string[];
  biggestWinnerCompanySlug: string;
  biggestLoserCompanySlug: string;
  mostImportantNewsSlug: string;
  watchNext: string[];
  digestNarrative?: string;
  headlineOfTheDay?: string;
  themesTags?: string[];
};

type CompanyRow = {
  id: string;
  slug: string;
  name: string;
};

type NewsRow = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  why_it_matters: string;
  importance_score: number;
  published_at: string;
};

type CompanyNewsRow = {
  company_id: string;
  news_item_id: string;
};

type MomentumScoreRow = {
  company_id: string;
  score_change_24h: number;
  calculated_at: string;
};

function clampStorySlugs(candidates: string[], availableSlugs: string[]) {
  const available = new Set(availableSlugs);
  const deduped = Array.from(new Set(candidates.filter((slug) => available.has(slug))));
  return deduped.slice(0, 10);
}

function fallbackDigest(news: Array<NewsRow & { companySlugs: string[] }>, winnerSlug: string, loserSlug: string): DigestDraft {
  const topStories = [...news]
    .sort((left, right) => right.importance_score - left.importance_score || new Date(right.published_at).getTime() - new Date(left.published_at).getTime())
    .slice(0, 10);
  const leadStory = topStories[0];

  return {
    summary: topStories
      .slice(0, 2)
      .map((story) => story.summary)
      .filter(Boolean)
      .join(" ")
      .slice(0, 420),
    topStorySlugs: topStories.map((story) => story.slug),
    biggestWinnerCompanySlug: winnerSlug,
    biggestLoserCompanySlug: loserSlug,
    mostImportantNewsSlug: leadStory?.slug ?? dailyDigest.mostImportantNewsSlug,
    watchNext: topStories.slice(0, 3).map((story) => story.why_it_matters).filter(Boolean),
    digestNarrative: dailyDigest.narrative,
    headlineOfTheDay: dailyDigest.headlineOfTheDay,
    themesTags: dailyDigest.themes,
  };
}

async function generateDigestWithLlm(
  digestDate: string,
  news: Array<NewsRow & { companySlugs: string[] }>,
  companies: CompanyRow[],
  fallback: DigestDraft,
) {
  const startedAt = Date.now();
  const response = await generateLlmText({
    systemPrompt: `You write the daily digest for ${BRAND_NAME}.

Be concise, analytical, and grounded. Focus on competitive dynamics, launches, enterprise traction, infrastructure moves, policy shifts, and momentum changes. No hype. Return only valid JSON with these keys:
- summary: 2 sentences
- topStorySlugs: array of 10 story slugs
- biggestWinnerCompanySlug: one company slug
- biggestLoserCompanySlug: one company slug
- mostImportantNewsSlug: one story slug
- watchNext: array of 3 forward-looking items`,
    prompt: `Digest date: ${digestDate}
Available companies:
${companies.map((company) => `- ${company.slug}: ${company.name}`).join("\n")}

Available stories:
${JSON.stringify(
  news.map((story) => ({
    slug: story.slug,
    headline: story.headline,
    companySlugs: story.companySlugs,
    publishedAt: story.published_at,
    importanceScore: story.importance_score,
    summary: story.summary,
    whyItMatters: story.why_it_matters,
  })),
)}`,
    temperature: 0.2,
    maxOutputTokens: 700,
  });

  const parsed = extractFirstJsonObject(response) as Partial<DigestDraft>;
  logger.info("llm", "digest_summary_completed", {
    digestDate,
    storyCount: news.length,
    latencyMs: Date.now() - startedAt,
  });
  const availableSlugs = news.map((story) => story.slug);
  const availableCompanies = new Set(companies.map((company) => company.slug));

  return {
    summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : fallback.summary,
    topStorySlugs:
      Array.isArray(parsed.topStorySlugs) && parsed.topStorySlugs.length > 0
        ? clampStorySlugs(parsed.topStorySlugs.filter((slug): slug is string => typeof slug === "string"), availableSlugs)
        : fallback.topStorySlugs,
    biggestWinnerCompanySlug:
      typeof parsed.biggestWinnerCompanySlug === "string" && availableCompanies.has(parsed.biggestWinnerCompanySlug)
        ? parsed.biggestWinnerCompanySlug
        : fallback.biggestWinnerCompanySlug,
    biggestLoserCompanySlug:
      typeof parsed.biggestLoserCompanySlug === "string" && availableCompanies.has(parsed.biggestLoserCompanySlug)
        ? parsed.biggestLoserCompanySlug
        : fallback.biggestLoserCompanySlug,
    mostImportantNewsSlug:
      typeof parsed.mostImportantNewsSlug === "string" && availableSlugs.includes(parsed.mostImportantNewsSlug)
        ? parsed.mostImportantNewsSlug
        : fallback.mostImportantNewsSlug,
    watchNext:
      Array.isArray(parsed.watchNext) && parsed.watchNext.length > 0
        ? parsed.watchNext.filter((item): item is string => typeof item === "string").slice(0, 3)
        : fallback.watchNext,
    digestNarrative: fallback.digestNarrative,
    headlineOfTheDay: fallback.headlineOfTheDay,
    themesTags: fallback.themesTags,
  } satisfies DigestDraft;
}

async function generateDigestNarrativeWithLlm(
  digestDate: string,
  digest: DigestDraft,
  news: Array<NewsRow & { companySlugs: string[] }>,
  rankedMomentum: Array<{ companySlug: string; scoreChange24h: number }>,
) {
  const topStories = digest.topStorySlugs
    .map((slug) => news.find((story) => story.slug === slug))
    .filter((story): story is NewsRow & { companySlugs: string[] } => Boolean(story));
  const startedAt = Date.now();
  const response = await generateLlmText({
    systemPrompt: `You write the lead editorial for ${BRAND_DIGEST_NAME}.

Write in a confident editorial voice with clean analysis and no hype. Connect the day's stories into themes instead of rewriting them one by one. Return only valid JSON with these keys:
- digestNarrative
- headlineOfTheDay
- themesTags`,
    prompt: `Digest date: ${digestDate}
Top stories:
${JSON.stringify(
  topStories.map((story) => ({
    slug: story.slug,
    headline: story.headline,
    summary: story.summary,
    whyItMatters: story.why_it_matters,
    companySlugs: story.companySlugs,
    importanceScore: story.importance_score,
  })),
)}

Momentum changes:
${JSON.stringify(rankedMomentum.slice(0, 10))}

Requirements:
- digestNarrative should be 3 to 5 paragraphs with plain newline separation.
- headlineOfTheDay should be a punchy editorial headline.
- themesTags should be 3 to 5 short theme phrases.`,
    temperature: 0.4,
    maxOutputTokens: 1_200,
  });

  const parsed = extractFirstJsonObject(response) as Partial<DigestDraft>;
  logger.info("llm", "digest_narrative_completed", {
    digestDate,
    storyCount: topStories.length,
    latencyMs: Date.now() - startedAt,
  });
  const themesTags =
    Array.isArray(parsed.themesTags) && parsed.themesTags.length > 0
      ? parsed.themesTags.filter((item): item is string => typeof item === "string").slice(0, 5)
      : Array.isArray((parsed as { themes?: unknown[] }).themes)
        ? (((parsed as { themes?: unknown[] }).themes ?? []).filter((item): item is string => typeof item === "string").slice(0, 5))
        : dailyDigest.themes;

  return {
    digestNarrative:
      typeof parsed.digestNarrative === "string" && parsed.digestNarrative.trim()
        ? parsed.digestNarrative.trim()
        : dailyDigest.narrative,
    headlineOfTheDay:
      typeof parsed.headlineOfTheDay === "string" && parsed.headlineOfTheDay.trim()
        ? parsed.headlineOfTheDay.trim()
        : dailyDigest.headlineOfTheDay,
    themesTags,
  };
}

export async function generateDailyDigest(referenceDate = new Date()) {
  const client = getSupabaseServiceClient();

  if (!client) {
    return {
      generated: false,
      stored: false,
      digestDate: format(referenceDate, "yyyy-MM-dd"),
      storyCount: 0,
      usedLlm: false,
      reason: "supabase-not-configured",
    };
  }

  const digestDate = format(referenceDate, "yyyy-MM-dd");
  const since = subHours(referenceDate, 24).toISOString();

  const [newsResult, companyNewsResult, companiesResult, momentumResult] = await Promise.all([
    client
      .from("news_items")
      .select("id, slug, headline, summary, why_it_matters, importance_score, published_at")
      .gte("published_at", since)
      .order("published_at", { ascending: false }),
    client.from("company_news").select("company_id, news_item_id"),
    client.from("companies").select("id, slug, name"),
    client.from("momentum_scores").select("company_id, score_change_24h, calculated_at").order("calculated_at", { ascending: false }),
  ]);

  if (newsResult.error || companyNewsResult.error || companiesResult.error || momentumResult.error) {
    throw newsResult.error ?? companyNewsResult.error ?? companiesResult.error ?? momentumResult.error;
  }

  const newsRows = (newsResult.data ?? []) as NewsRow[];
  const companyNewsRows = (companyNewsResult.data ?? []) as CompanyNewsRow[];
  const companies = (companiesResult.data ?? []) as CompanyRow[];
  const momentumRows = (momentumResult.data ?? []) as MomentumScoreRow[];

  if (newsRows.length < 5) {
    return {
      generated: false,
      stored: false,
      digestDate,
      storyCount: newsRows.length,
      usedLlm: false,
      reason: "insufficient-stories",
    };
  }

  const companyIdsByNewsId = companyNewsRows.reduce<Record<string, string[]>>((accumulator, row) => {
    accumulator[row.news_item_id] = [...(accumulator[row.news_item_id] ?? []), row.company_id];
    return accumulator;
  }, {});
  const companySlugById = Object.fromEntries(companies.map((company) => [company.id, company.slug]));

  const newsWithCompanies = newsRows.map((story) => ({
    ...story,
    companySlugs: (companyIdsByNewsId[story.id] ?? []).map((companyId) => companySlugById[companyId]).filter(Boolean),
  }));

  const latestMomentumByCompany = new Map<string, MomentumScoreRow>();

  for (const row of momentumRows) {
    if (!latestMomentumByCompany.has(row.company_id)) {
      latestMomentumByCompany.set(row.company_id, row);
    }
  }

  const rankedMomentum = Array.from(latestMomentumByCompany.entries())
    .map(([companyId, row]) => ({
      companySlug: companySlugById[companyId],
      scoreChange24h: row.score_change_24h,
    }))
    .filter((row): row is { companySlug: string; scoreChange24h: number } => Boolean(row.companySlug))
    .sort((left, right) => right.scoreChange24h - left.scoreChange24h);

  const fallback = fallbackDigest(
    newsWithCompanies,
    rankedMomentum[0]?.companySlug ?? dailyDigest.biggestWinnerCompanySlug,
    rankedMomentum[rankedMomentum.length - 1]?.companySlug ?? dailyDigest.biggestLoserCompanySlug,
  );

  const digest = isLlmConfigured()
    ? await generateDigestWithLlm(digestDate, newsWithCompanies, companies, fallback).catch(() => fallback)
    : fallback;
  const narrative =
    isLlmConfigured()
      ? await generateDigestNarrativeWithLlm(digestDate, digest, newsWithCompanies, rankedMomentum).catch(() => ({
          digestNarrative: fallback.digestNarrative,
          headlineOfTheDay: fallback.headlineOfTheDay,
          themesTags: fallback.themesTags,
        }))
      : {
          digestNarrative: fallback.digestNarrative,
          headlineOfTheDay: fallback.headlineOfTheDay,
          themesTags: fallback.themesTags,
        };

  const newsIdBySlug = Object.fromEntries(newsRows.map((story) => [story.slug, story.id]));
  const companyIdBySlug = Object.fromEntries(companies.map((company) => [company.slug, company.id]));

  const { error } = await client.from("daily_digests").upsert(
    {
      digest_date: digestDate,
      title: `${BRAND_DIGEST_NAME} | ${digestDate}`,
      summary: digest.summary,
      biggest_winner_company_id: companyIdBySlug[digest.biggestWinnerCompanySlug] ?? companyIdBySlug[dailyDigest.biggestWinnerCompanySlug],
      biggest_loser_company_id: companyIdBySlug[digest.biggestLoserCompanySlug] ?? companyIdBySlug[dailyDigest.biggestLoserCompanySlug],
      most_important_news_item_id: newsIdBySlug[digest.mostImportantNewsSlug] ?? newsIdBySlug[dailyDigest.mostImportantNewsSlug] ?? null,
      top_story_slugs: digest.topStorySlugs,
      watch_next: digest.watchNext,
      narrative: narrative.digestNarrative ?? null,
      headline_of_the_day: narrative.headlineOfTheDay ?? null,
      themes: narrative.themesTags ?? [],
    },
    { onConflict: "digest_date" },
  );

  if (error) {
    throw error;
  }

  return {
    generated: true,
    stored: true,
    digestDate,
    storyCount: newsRows.length,
    usedLlm: isLlmConfigured(),
    previewTitle: `${BRAND_DIGEST_NAME} | ${digestDate}`,
    previewLeadStory: newsItemsBySlug[digest.mostImportantNewsSlug]?.headline ?? digest.mostImportantNewsSlug,
  };
}
