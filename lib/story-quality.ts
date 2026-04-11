import { isGenericWhyItMatters, isHeadlineRestatement, sanitizeEditorialText } from "@/lib/content";
import { companiesBySlug, type NewsItem } from "@/lib/seed/data";
import { hasDisplayText, toCompleteSentence } from "@/lib/utils";

const STRATEGIC_CATEGORY_SLUGS = new Set([
  "model-release",
  "product-launch",
  "funding",
  "partnership",
  "infrastructure",
  "policy-regulation",
  "leadership",
  "research",
  "benchmark",
]);

const MULTI_COMPANY_CATEGORY_SLUGS = new Set([
  "partnership",
  "funding",
  "policy-regulation",
  "leadership",
  "infrastructure",
]);

const STRATEGIC_KEYWORD_PATTERN =
  /\b(launch(?:ed|es)?|release(?:d|s)?|rollout|available|general availability|preview|deal|partnership|funding|raised|pricing|enterprise|policy|regulation|compliance|probe|lawsuit|ban|appoint(?:ed|s)?|hires?|steps down|data center|cluster|capacity|gpu|inference|model|benchmark|reasoning|acquisition|merger|distribution)\b/i;
const COMMENTARY_PATTERN =
  /\b(opinion|essay|column|interview|podcast|profile|conversation|roundtable)\b/i;
const CULTURE_COMMENTARY_PATTERN =
  /\b(ai art|brainstorming with chatgpt|analyzing data with chatgpt|out-shitposted|shitposted)\b/i;
const PERSONAL_DRAMA_PATTERN =
  /\b(molotov cocktail|arrested|allegedly|house\b|home\b|police\b|charged\b|threw a molotov)\b/i;
const LAUNCH_SIGNAL_PATTERN =
  /\b(launch(?:ed|es)?|release(?:d|s)?|rollout|rolls out|general availability|ga\b|preview|now available|ships|shipping|debut(?:ed|s)?|api|model|assistant|platform|app)\b/i;
const LAUNCH_EXCLUSION_PATTERN =
  /\b(banned?|arrested|interview|podcast|essay|profile|opinion|lawsuit|investigation|hearing)\b/i;
const COMMUNITY_SOURCE_PATTERN = /\b(hacker news|reddit)\b/i;
const GENERIC_WATCH_PATTERN = /\b(broader availability|independent validation|converts fresh capital into hiring|pricing, and independent validation)\b/i;

function storyText(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters">) {
  return sanitizeEditorialText([item.headline, item.summary, item.shortSummary, item.whyItMatters].filter(Boolean).join(" "));
}

function mentionsCompanyInText(text: string, companySlug: string) {
  const company = companiesBySlug[companySlug];
  const candidates = [company?.name, company?.shortName, companySlug]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const normalizedText = text.toLowerCase();

  return candidates.some((candidate) => normalizedText.includes(candidate.toLowerCase()));
}

export function isOffTopicStory(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters">) {
  const text = storyText(item);

  if (!text) {
    return true;
  }

  return CULTURE_COMMENTARY_PATTERN.test(text) || PERSONAL_DRAMA_PATTERN.test(text);
}

export function hasStrategicSignal(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs">) {
  if (item.categorySlugs.some((slug) => STRATEGIC_CATEGORY_SLUGS.has(slug))) {
    return true;
  }

  return STRATEGIC_KEYWORD_PATTERN.test(storyText(item));
}

export function isPrestigeSurfaceStory(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs" | "companySlugs" | "confidenceScore" | "importanceScore" | "sourceName">) {
  if (item.companySlugs.length === 0) {
    return false;
  }

  if (isOffTopicStory(item)) {
    return false;
  }

  const text = storyText(item);
  const commentaryOnly = COMMENTARY_PATTERN.test(text) && !hasStrategicSignal(item);

  if (commentaryOnly) {
    return false;
  }

  if (COMMUNITY_SOURCE_PATTERN.test(item.sourceName) && item.importanceScore < 6 && !hasStrategicSignal(item)) {
    return false;
  }

  return item.confidenceScore >= 4 && (hasStrategicSignal(item) || item.importanceScore >= 7);
}

export function isDigestSurfaceStory(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs" | "companySlugs" | "confidenceScore" | "importanceScore" | "sourceName">) {
  return isPrestigeSurfaceStory(item) && item.importanceScore >= 6;
}

export function isBreakingSurfaceStory(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs" | "companySlugs" | "confidenceScore" | "importanceScore" | "sourceName">) {
  return isPrestigeSurfaceStory(item) && item.importanceScore >= 8;
}

export function isLaunchSurfaceStory(item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs" | "companySlugs" | "confidenceScore" | "importanceScore" | "sourceName">) {
  const text = storyText(item);

  if (!isPrestigeSurfaceStory(item)) {
    return false;
  }

  if (!item.categorySlugs.some((slug) => slug === "model-release" || slug === "product-launch")) {
    return false;
  }

  if (!LAUNCH_SIGNAL_PATTERN.test(text) || LAUNCH_EXCLUSION_PATTERN.test(text)) {
    return false;
  }

  return !COMMUNITY_SOURCE_PATTERN.test(item.sourceName);
}

export function isCompanyRelevantStory(
  item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs" | "companySlugs" | "confidenceScore" | "importanceScore" | "sourceName">,
  companySlug: string,
) {
  if (!item.companySlugs.includes(companySlug) || !isPrestigeSurfaceStory(item)) {
    return false;
  }

  if (item.companySlugs[0] === companySlug) {
    return true;
  }

  return item.companySlugs.slice(0, 2).includes(companySlug) && item.categorySlugs.some((slug) => MULTI_COMPANY_CATEGORY_SLUGS.has(slug));
}

export function isSharedCompareStory(
  item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters" | "categorySlugs" | "companySlugs" | "confidenceScore" | "importanceScore" | "sourceName">,
  selectedSlugs: string[],
) {
  const overlap = item.companySlugs.filter((slug) => selectedSlugs.includes(slug));

  if (overlap.length < 2 || !isPrestigeSurfaceStory(item)) {
    return false;
  }

  return overlap.every((slug) => isCompanyRelevantStory(item, slug));
}

export function buildStoryDriverCopy(
  item: Pick<NewsItem, "headline" | "summary" | "shortSummary" | "whyItMatters"> | null | undefined,
  companySlug?: string,
) {
  if (!item) {
    return "";
  }

  const whyItMatters = sanitizeEditorialText(item.whyItMatters);

  if (hasDisplayText(whyItMatters) && !isGenericWhyItMatters(whyItMatters) && !isHeadlineRestatement(item.headline, whyItMatters)) {
    return toCompleteSentence(whyItMatters);
  }

  const summary = sanitizeEditorialText(item.summary);

  if (hasDisplayText(summary) && !isHeadlineRestatement(item.headline, summary)) {
    return toCompleteSentence(summary);
  }

  const shortSummary = sanitizeEditorialText(item.shortSummary);

  if (hasDisplayText(shortSummary) && !isHeadlineRestatement(item.headline, shortSummary)) {
    return toCompleteSentence(shortSummary);
  }

  const headline = sanitizeEditorialText(item.headline);

  if (companySlug && mentionsCompanyInText(storyText(item), companySlug)) {
    return toCompleteSentence(headline);
  }

  return "";
}

export function filterDigestWatchNext(items: string[]) {
  const seen = new Set<string>();

  return items
    .map((item) => toCompleteSentence(item))
    .filter(Boolean)
    .filter((item) => !GENERIC_WATCH_PATTERN.test(item))
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}
