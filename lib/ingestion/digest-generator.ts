import { format, subHours } from "date-fns";

import { BRAND_DIGEST_NAME, BRAND_NAME } from "../brand.ts";
import { getSupabaseServiceClient } from "../db/client.ts";
import { extractFirstJsonObject } from "../llm/json.ts";
import { generateLlmText, isLlmConfigured } from "../llm/openai.ts";
import { logger } from "../monitoring/logger.ts";
import { dailyDigest, newsItemsBySlug } from "../seed/data.ts";
import { inferSourceTierFromStory } from "./editorial.ts";

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
  short_summary: string;
  why_it_matters: string;
  importance_score: number;
  confidence_score: number;
  published_at: string;
  source_name: string;
  source_url: string;
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

type NewsCategoryRow = {
  news_item_id: string;
  category_id: string;
};

type CategoryRow = {
  id: string;
  slug: string;
};

type DigestStory = NewsRow & {
  companySlugs: string[];
  categorySlugs: string[];
  sourceTier: ReturnType<typeof inferSourceTierFromStory>;
  digestPriority: number;
  leadEligible: boolean;
};

function clampStorySlugs(candidates: string[], availableSlugs: string[]) {
  const available = new Set(availableSlugs);
  const deduped = Array.from(new Set(candidates.filter((slug) => available.has(slug))));
  return deduped.slice(0, 6);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function buildWatchItem(story: DigestStory) {
  const subject = story.companySlugs[0] ?? story.headline;

  if (story.categorySlugs.includes("model-release")) {
    return `Watch for broader availability, pricing, and independent validation after ${subject}.`;
  }

  if (story.categorySlugs.includes("product-launch")) {
    return `Watch whether ${subject} moves from announcement into customer rollout and paid usage.`;
  }

  if (story.categorySlugs.includes("partnership")) {
    return `Watch for customer names, rollout scope, and revenue impact tied to ${subject}.`;
  }

  if (story.categorySlugs.includes("infrastructure")) {
    return `Watch for capacity timelines and whether ${subject} speeds up product rollout.`;
  }

  if (story.categorySlugs.includes("funding")) {
    return `Watch how ${subject} converts fresh capital into hiring, compute, or distribution gains.`;
  }

  if (story.categorySlugs.includes("policy-regulation")) {
    return `Watch for enforcement dates and vendor responses tied to ${subject}.`;
  }

  if (story.categorySlugs.includes("leadership")) {
    return `Watch for org changes, hiring moves, or roadmap shifts following ${subject}.`;
  }

  return `Watch for concrete follow-through, not commentary alone, after ${subject}.`;
}

function digestPriority(story: DigestStory) {
  let score = story.importance_score * 10 + story.confidence_score * 2;

  if (story.categorySlugs.includes("model-release")) {
    score += 16;
  }

  if (story.categorySlugs.includes("product-launch")) {
    score += 12;
  }

  if (story.categorySlugs.includes("partnership") || story.categorySlugs.includes("funding") || story.categorySlugs.includes("infrastructure")) {
    score += 10;
  }

  if (story.categorySlugs.every((slug) => slug === "research" || slug === "benchmark")) {
    score -= 18;
  }

  if (story.sourceTier === "community") {
    score -= 30;
  }

  if (story.sourceTier === "research-repository") {
    score -= 16;
  }

  if (story.companySlugs.length === 0) {
    score -= 10;
  }

  return score;
}

function isLeadEligible(story: DigestStory) {
  if (story.confidence_score < 6 || story.importance_score < 5) {
    return false;
  }

  if (story.sourceTier === "community") {
    return false;
  }

  if (story.categorySlugs.length === 0) {
    return false;
  }

  if (story.categorySlugs.every((slug) => slug === "research" || slug === "benchmark")) {
    return false;
  }

  return true;
}

function buildDigestStories(
  news: Array<NewsRow & { companySlugs: string[] }>,
  categorySlugsByNewsId: Map<string, string[]>,
) {
  return news
    .map<DigestStory>((story) => {
      const categorySlugs = categorySlugsByNewsId.get(story.id) ?? [];
      const sourceTier = inferSourceTierFromStory(story.source_name, story.source_url);
      const digestStory: DigestStory = {
        ...story,
        categorySlugs,
        sourceTier,
        digestPriority: 0,
        leadEligible: false,
      };

      return {
        ...digestStory,
        digestPriority: digestPriority(digestStory),
        leadEligible: isLeadEligible(digestStory),
      };
    })
    .sort(
      (left, right) =>
        right.digestPriority - left.digestPriority ||
        new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
    );
}

function fallbackNarrative(topStories: DigestStory[], weakPool: boolean) {
  if (topStories.length === 0) {
    return {
      digestNarrative: "The last 24 hours were light on confirmed, high-signal competitive AI moves, so the digest is intentionally sparse.",
      headlineOfTheDay: "A lighter day for credible AI movement",
      themesTags: ["light signal", "strict filtering"],
    };
  }

  const lead = topStories[0];
  const second = topStories[1];
  const leadLine = lead.summary || lead.short_summary || lead.headline;
  const secondLine = second ? second.summary || second.short_summary || second.headline : "";

  return {
    digestNarrative: weakPool
      ? `The story pool was thin today, so the digest is led only by items with cleaner evidence and clearer competitive implications.\n\n${leadLine}${secondLine ? ` ${secondLine}` : ""}`
      : `${leadLine}\n\n${secondLine || "The rest of the digest stays focused on distribution, infrastructure, and policy moves with real market consequences."}`,
    headlineOfTheDay: weakPool ? "Signal over volume" : lead.headline,
    themesTags: uniqueValues(topStories.flatMap((story) => story.categorySlugs)).slice(0, 4),
  };
}

function fallbackDigest(news: DigestStory[], winnerSlug: string, loserSlug: string): DigestDraft {
  const leadStories = news.filter((story) => story.leadEligible);
  const topStories = (leadStories.length > 0 ? leadStories : news.filter((story) => story.sourceTier !== "community")).slice(0, 6);
  const leadStory = topStories[0];
  const weakPool = leadStories.length < 3;

  return {
    summary:
      weakPool && topStories.length > 0
        ? `The story pool was thin, so the digest is prioritizing only the clearest competitive moves. ${topStories
            .slice(0, 2)
            .map((story) => story.short_summary || story.summary || story.headline)
            .filter(Boolean)
            .join(" ")}`
        : topStories
            .slice(0, 2)
            .map((story) => story.summary || story.short_summary || story.headline)
            .filter(Boolean)
            .join(" ")
            .slice(0, 420),
    topStorySlugs: topStories.map((story) => story.slug),
    biggestWinnerCompanySlug: winnerSlug,
    biggestLoserCompanySlug: loserSlug,
    mostImportantNewsSlug: leadStory?.slug ?? dailyDigest.mostImportantNewsSlug,
    watchNext: uniqueValues(topStories.slice(0, 3).map((story) => buildWatchItem(story))).slice(0, 3),
    ...fallbackNarrative(topStories, weakPool),
  };
}

async function generateDigestWithLlm(
  digestDate: string,
  news: DigestStory[],
  companies: CompanyRow[],
  fallback: DigestDraft,
) {
  const startedAt = Date.now();
  const response = await generateLlmText({
    systemPrompt: `You write the daily digest for ${BRAND_NAME}.

Be concise, analytical, and grounded. Lead with real competitive movement, not community chatter or research-only items. If the story pool is weak, prefer fewer cleaner stories over padding the digest. Return only valid JSON with these keys:
- summary: 2 sentences
- topStorySlugs: array of 3 to 6 story slugs
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
    categorySlugs: story.categorySlugs,
    sourceTier: story.sourceTier,
    publishedAt: story.published_at,
    importanceScore: story.importance_score,
    confidenceScore: story.confidence_score,
    summary: story.summary,
    shortSummary: story.short_summary,
    whyItMatters: story.why_it_matters,
    leadEligible: story.leadEligible,
  })),
)}

Requirements:
- do not choose a leadEligible false story as the lead if an eligible alternative exists.
- do not turn research-only or benchmark-only items into the flagship story.
- watchNext items must be concrete follow-up signals, not generic filler.`,
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
  news: DigestStory[],
  rankedMomentum: Array<{ companySlug: string; scoreChange24h: number }>,
) {
  const topStories = digest.topStorySlugs
    .map((slug) => news.find((story) => story.slug === slug))
    .filter((story): story is DigestStory => Boolean(story));
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
    shortSummary: story.short_summary,
    whyItMatters: story.why_it_matters,
    companySlugs: story.companySlugs,
    categorySlugs: story.categorySlugs,
    importanceScore: story.importance_score,
  })),
)}

Momentum changes:
${JSON.stringify(rankedMomentum.slice(0, 10))}

Requirements:
- digestNarrative should be 3 to 5 paragraphs with plain newline separation.
- headlineOfTheDay should be a punchy editorial headline.
- themesTags should be 3 to 5 short theme phrases.
- if the story pool is weak, say so plainly instead of inventing a grand narrative.`,
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

  const [newsResult, companyNewsResult, companiesResult, momentumResult, categoryResult, newsCategoryResult] = await Promise.all([
    client
      .from("news_items")
      .select("id, slug, headline, summary, short_summary, why_it_matters, importance_score, confidence_score, published_at, source_name, source_url")
      .gte("published_at", since)
      .order("published_at", { ascending: false }),
    client.from("company_news").select("company_id, news_item_id"),
    client.from("companies").select("id, slug, name"),
    client.from("momentum_scores").select("company_id, score_change_24h, calculated_at").order("calculated_at", { ascending: false }),
    client.from("categories").select("id, slug"),
    client.from("news_item_categories").select("news_item_id, category_id"),
  ]);

  if (newsResult.error || companyNewsResult.error || companiesResult.error || momentumResult.error || categoryResult.error || newsCategoryResult.error) {
    throw newsResult.error ?? companyNewsResult.error ?? companiesResult.error ?? momentumResult.error ?? categoryResult.error ?? newsCategoryResult.error;
  }

  const newsRows = (newsResult.data ?? []) as NewsRow[];
  const companyNewsRows = (companyNewsResult.data ?? []) as CompanyNewsRow[];
  const companies = (companiesResult.data ?? []) as CompanyRow[];
  const momentumRows = (momentumResult.data ?? []) as MomentumScoreRow[];
  const categoryRows = (categoryResult.data ?? []) as CategoryRow[];
  const newsCategoryRows = (newsCategoryResult.data ?? []) as NewsCategoryRow[];

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
  const categorySlugById = Object.fromEntries(categoryRows.map((category) => [category.id, category.slug]));
  const categorySlugsByNewsId = newsCategoryRows.reduce<Map<string, string[]>>((accumulator, row) => {
    const slug = categorySlugById[row.category_id];

    if (!slug) {
      return accumulator;
    }

    accumulator.set(row.news_item_id, [...(accumulator.get(row.news_item_id) ?? []), slug]);
    return accumulator;
  }, new Map<string, string[]>());

  const newsWithCompanies = newsRows.map((story) => ({
    ...story,
    companySlugs: (companyIdsByNewsId[story.id] ?? []).map((companyId) => companySlugById[companyId]).filter(Boolean),
  }));
  const digestStories = buildDigestStories(newsWithCompanies, categorySlugsByNewsId);

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
    digestStories,
    rankedMomentum[0]?.companySlug ?? dailyDigest.biggestWinnerCompanySlug,
    rankedMomentum[rankedMomentum.length - 1]?.companySlug ?? dailyDigest.biggestLoserCompanySlug,
  );

  const eligibleStories = digestStories.filter((story) => story.leadEligible);
  const shouldUseLlm = isLlmConfigured() && eligibleStories.length >= 3;
  const digest = shouldUseLlm
    ? await generateDigestWithLlm(digestDate, digestStories, companies, fallback).catch(() => fallback)
    : fallback;
  const narrative =
    shouldUseLlm
      ? await generateDigestNarrativeWithLlm(digestDate, digest, digestStories, rankedMomentum).catch(() => ({
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
    usedLlm: shouldUseLlm,
    previewTitle: `${BRAND_DIGEST_NAME} | ${digestDate}`,
    previewLeadStory: newsItemsBySlug[digest.mostImportantNewsSlug]?.headline ?? digest.mostImportantNewsSlug,
  };
}
