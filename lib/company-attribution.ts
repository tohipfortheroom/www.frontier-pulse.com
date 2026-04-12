import { companiesBySlug } from "@/lib/seed/data";
import { companyKeywordMap, matchesKeyword } from "@/lib/ingestion/keywords";

type StoryAttributionContext = {
  headline: string;
  body?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  companyHint?: string | null;
};

type CompanyScore = {
  slug: string;
  score: number;
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

function scoreCompany(slug: string, context: StoryAttributionContext) {
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

function scoreCompanies(companySlugs: string[], context: StoryAttributionContext): CompanyScore[] {
  return Array.from(new Set(companySlugs.filter(Boolean))).map((slug) => ({
    slug,
    score: scoreCompany(slug, context),
  }));
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
  const scored = scoreCompanies(Object.keys(companiesBySlug), context)
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

export function filterCompanySlugsByStoryContext(
  companySlugs: string[],
  context: StoryAttributionContext,
  options?: {
    minimumScore?: number;
    relativeFloor?: number;
  },
) {
  const uniqueSlugs = Array.from(new Set(companySlugs.filter(Boolean)));

  if (uniqueSlugs.length <= 1) {
    return uniqueSlugs;
  }

  const scored = scoreCompanies(uniqueSlugs, context).sort((left, right) => right.score - left.score);
  const best = scored[0];

  if (!best) {
    return uniqueSlugs;
  }

  const minimumScore = options?.minimumScore ?? 6;
  const relativeFloor = options?.relativeFloor ?? 0.35;
  const scoreFloor = Math.max(4, Math.ceil(best.score * relativeFloor));
  const keepers = scored.filter((entry) => entry.score >= minimumScore && entry.score >= scoreFloor);

  if (keepers.length > 0) {
    return keepers.map((entry) => entry.slug);
  }

  if (context.companyHint && uniqueSlugs.includes(context.companyHint)) {
    return [context.companyHint];
  }

  const inferredPrimary = inferPrimaryCompanySlug(context);

  if (inferredPrimary && uniqueSlugs.includes(inferredPrimary)) {
    return [inferredPrimary];
  }

  return [best.slug];
}

export function rankCompanySlugsByStoryContext(companySlugs: string[], context: StoryAttributionContext) {
  const uniqueSlugs = Array.from(new Set(companySlugs.filter(Boolean)));

  if (uniqueSlugs.length <= 1) {
    return uniqueSlugs;
  }

  const scored = scoreCompanies(uniqueSlugs, context).map((entry, index) => ({
    slug: entry.slug,
    index,
    score: entry.score,
  }));

  const hasSignal = scored.some((entry) => entry.score > 0);

  if (!hasSignal) {
    return uniqueSlugs;
  }

  return scored
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.slug);
}
