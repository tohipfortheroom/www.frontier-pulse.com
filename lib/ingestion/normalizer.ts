import { createHash } from "node:crypto";

import { companiesBySlug } from "../seed/data.ts";
import { companyKeywordMap, matchesAnyKeyword, tagKeywordMap } from "./keywords.ts";
import { buildTitleFingerprint, canonicalizeUrl } from "./quality.ts";

import type { NormalizedCandidate, RawIngestedItem } from "./types.ts";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function cleanText(input?: string) {
  return input?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

function detectCompanies(text: string, companyHint?: string) {
  const matches = Object.entries(companyKeywordMap)
    .filter(([, keywords]) => matchesAnyKeyword(text, keywords))
    .map(([slug]) => slug);

  if (matches.length > 0) {
    return matches;
  }

  if (companyHint && companiesBySlug[companyHint]) {
    return [companyHint];
  }

  return [];
}

function detectCategories(text: string) {
  const normalized = text.toLowerCase();
  const categories = new Set<string>();

  if (/(launch|release|ships|rolls out|preview)/i.test(normalized)) {
    categories.add(/model|llm|claude|gpt|gemini|llama|grok|reasoning/i.test(normalized) ? "model-release" : "product-launch");
  }

  if (/(partner|partnership|agreement|deal|rollout with)/i.test(normalized)) {
    categories.add("partnership");
  }

  if (/(acquires|acquisition|acquire|merger|merges with|buyout|takes stake)/i.test(normalized)) {
    categories.add("partnership");
  }

  if (/(funding|valuation|raises|financing|round)/i.test(normalized)) {
    categories.add("funding");
  }

  if (/(research|benchmark|eval|paper|study|claim)/i.test(normalized)) {
    categories.add("research");
  }

  if (/(policy|regulation|complaint|act|rule|export control)/i.test(normalized)) {
    categories.add("policy-regulation");
  }

  if (/(data center|cluster|capacity|shipping|racks|infrastructure|silicon|gpu)/i.test(normalized)) {
    categories.add("infrastructure");
  }

  if (/(appoints|hires|recruits|poaches|steps down|joins from|former .* joins|advisory|chief|executive|leadership|talent)/i.test(normalized)) {
    categories.add("leadership");
  }

  if (categories.size === 0) {
    categories.add("product-launch");
  }

  return [...categories];
}

function detectTags(text: string) {
  return Object.entries(tagKeywordMap)
    .filter(([, keywords]) => matchesAnyKeyword(text, keywords))
    .map(([slug]) => slug);
}

function detectImpactDirection(text: string) {
  const normalized = text.toLowerCase();

  if (/(churn|pressure|complaint|setback|delay|risk|steps down|cuts|concern)/i.test(normalized)) {
    return "negative";
  }

  if (/(launch|release|ships|wins|agreement|expands|tops|opens|preview|acquires|hires|recruits)/i.test(normalized)) {
    return "positive";
  }

  return "neutral";
}

export function normalizeIngestedItem(item: RawIngestedItem): NormalizedCandidate | null {
  const text = `${item.title} ${item.excerpt ?? ""}`.trim();
  const cleanedText = cleanText(item.excerpt ?? item.rawText);
  const companySlugs = detectCompanies(text, item.companyHint);
  const categorySlugs = detectCategories(text);
  const tagSlugs = detectTags(text);
  const canonicalUrl = canonicalizeUrl(item.url);
  const titleFingerprint = buildTitleFingerprint(item.title);
  const slugSuffix = createHash("sha1").update(canonicalUrl || `${item.sourceId}:${item.title}`).digest("hex").slice(0, 8);

  if (!item.title) {
    return null;
  }

  return {
    headline: item.title,
    slug: `${slugify(item.title)}-${slugSuffix}`,
    sourceName: item.sourceName,
    sourceUrl: canonicalUrl || item.url,
    sourceId: item.sourceId,
    canonicalUrl: canonicalUrl || item.url,
    titleFingerprint,
    publishedAt: item.publishedAt ?? item.fetchedAt,
    rawText: item.rawText ?? null,
    cleanedText: cleanedText || null,
    impactDirection: detectImpactDirection(text),
    companySlugs,
    categorySlugs,
    tagSlugs,
    significanceSignals: [...categorySlugs, ...tagSlugs].slice(0, 6),
  };
}
