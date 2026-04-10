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

  let score = 0;
  score += countKeywordMatches(headline, keywords) * 6;
  score += countKeywordMatches(body, keywords) * 3;
  score += countKeywordMatches(sourceName, keywords) * 4;

  if (companyNames.some((value) => sourceHost.includes(value.replace(/\s+/g, "")) || sourceHost.includes(value.replace(/\s+/g, "-")))) {
    score += 5;
  }

  if (context.companyHint === slug) {
    score += 8;
  }

  return score;
}

export function rankCompanySlugsByStoryContext(companySlugs: string[], context: StoryAttributionContext) {
  const uniqueSlugs = Array.from(new Set(companySlugs.filter(Boolean)));

  if (uniqueSlugs.length <= 1) {
    return uniqueSlugs;
  }

  const scored = uniqueSlugs.map((slug, index) => ({
    slug,
    index,
    score: scoreCompany(slug, context),
  }));

  const hasSignal = scored.some((entry) => entry.score > 0);

  if (!hasSignal) {
    return uniqueSlugs;
  }

  return scored
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.slug);
}
