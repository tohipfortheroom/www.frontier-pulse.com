import { companiesBySlug } from "@/lib/seed/data";
import { companyKeywordMap, matchesKeyword } from "@/lib/ingestion/keywords";

type StoryAttributionContext = {
  headline: string;
  body?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  companyHint?: string | null;
};

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (matchesKeyword(text, keyword) ? 1 : 0), 0);
}

function hostnameFromUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function scoreCompanySlugForStoryContext(slug: string, context: StoryAttributionContext) {
  const keywords = companyKeywordMap[slug] ?? [];

  if (keywords.length === 0) {
    return 0;
  }

  const company = companiesBySlug[slug];
  const headline = context.headline.trim();
  const body = (context.body ?? "").trim();
  const sourceName = (context.sourceName ?? "").trim();
  const sourceHost = hostnameFromUrl(context.sourceUrl);
  const companyNames = [company?.name, company?.shortName, slug]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const textKeywords = Array.from(new Set([...keywords, ...companyNames]));

  let score = 0;
  score += countKeywordMatches(headline, textKeywords) * 6;
  score += countKeywordMatches(body, textKeywords) * 3;
  score += countKeywordMatches(sourceName, textKeywords) * 4;

  if (companyNames.some((value) => sourceHost.includes(value.replace(/\s+/g, "")) || sourceHost.includes(value.replace(/\s+/g, "-")))) {
    score += 5;
  }

  if (context.companyHint === slug) {
    score += 8;
  }

  return score;
}

function doesHeadlineMentionCompany(slug: string, headline: string) {
  const keywords = companyKeywordMap[slug] ?? [];
  return keywords.some((keyword) => matchesKeyword(headline, keyword));
}

export function inferPrimaryCompanySlug(
  context: StoryAttributionContext,
  options?: {
    minScore?: number;
    minimumLead?: number;
  },
) {
  const minScore = options?.minScore ?? 6;
  const minimumLead = options?.minimumLead ?? 3;
  const scored = Object.keys(companiesBySlug)
    .map((slug) => ({
      slug,
      score: scoreCompanySlugForStoryContext(slug, context),
    }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const runnerUp = scored[1];

  if (!best || best.score < minScore) {
    return null;
  }

  if (runnerUp && best.score - runnerUp.score < minimumLead) {
    return null;
  }

  return best.slug;
}

export function rankCompanySlugsByStoryContext(companySlugs: string[], context: StoryAttributionContext) {
  const uniqueSlugs = Array.from(new Set(companySlugs.filter(Boolean)));

  if (uniqueSlugs.length <= 1) {
    return uniqueSlugs;
  }

  const scored = uniqueSlugs.map((slug, index) => ({
    slug,
    index,
    score: scoreCompanySlugForStoryContext(slug, context),
  }));

  const hasSignal = scored.some((entry) => entry.score > 0);

  if (!hasSignal) {
    return uniqueSlugs;
  }

  return scored
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.slug);
}

export function filterCompanySlugsByStoryContext(
  companySlugs: string[],
  context: StoryAttributionContext,
  options?: {
    minScore?: number;
    headlineMentionScore?: number;
    fallbackMinScore?: number;
    minimumLead?: number;
    maxCompanies?: number;
  },
) {
  const uniqueSlugs = Array.from(new Set(companySlugs.filter(Boolean)));

  const minScore = options?.minScore ?? 6;
  const headlineMentionScore = options?.headlineMentionScore ?? 4;
  const fallbackMinScore = options?.fallbackMinScore ?? 8;
  const minimumLead = options?.minimumLead ?? 2;
  const maxCompanies = options?.maxCompanies ?? 2;

  const scored = uniqueSlugs
    .map((slug, index) => ({
      slug,
      index,
      score: scoreCompanySlugForStoryContext(slug, context),
      headlineMention: doesHeadlineMentionCompany(slug, context.headline),
      hinted: context.companyHint === slug,
    }))
    .sort((left, right) => right.score - left.score || Number(right.headlineMention) - Number(left.headlineMention) || left.index - right.index);

  const filtered = scored.filter((entry) => entry.hinted || entry.score >= minScore || (entry.headlineMention && entry.score >= headlineMentionScore));

  if (filtered.length > 0) {
    return filtered.slice(0, maxCompanies).map((entry) => entry.slug);
  }

  const [best, runnerUp] = scored;

  if (!best) {
    return [];
  }

  if (best.hinted || best.score >= fallbackMinScore || (best.headlineMention && best.score >= headlineMentionScore && (!runnerUp || best.score - runnerUp.score >= minimumLead))) {
    return [best.slug];
  }

  return [];
}
