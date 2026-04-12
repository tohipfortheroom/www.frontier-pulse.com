import { createHash } from "node:crypto";

import { companiesBySlug } from "../seed/data.ts";
import { sanitizeEditorialText } from "../content.ts";
import { companyKeywordMap, matchesAnyKeyword, tagKeywordMap } from "./keywords.ts";
import { buildTitleFingerprint, canonicalizeUrl } from "./quality.ts";
import { filterCompanySlugsByStoryContext, inferPrimaryCompanySlug, rankCompanySlugsByStoryContext } from "../company-attribution.ts";
import { hasAcquisitionSignal, hasInfrastructureSignal, hasPartnershipSignal } from "./story-signals.ts";

import type { NormalizedCandidate, RawIngestedItem } from "./types.ts";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function cleanText(input?: string) {
  return sanitizeEditorialText(input);
}

function detectCompanies(text: string, companyHint?: string) {
  const matches = Object.entries(companyKeywordMap)
    .filter(([, keywords]) => matchesAnyKeyword(text, keywords))
    .map(([slug]) => slug);

  if (matches.length > 0) {
    return rankCompanySlugsByStoryContext(matches, {
      headline: text,
      companyHint,
    });
  }

  if (companyHint && companiesBySlug[companyHint]) {
    return [companyHint];
  }

  return [];
}

function detectCategories(text: string) {
  const normalized = text.toLowerCase();
  const categories = new Set<string>();
  const communityShowcase = /^(show|ask|tell) hn\b/i.test(text);
  const researchOnly = /(research|paper|study|preprint|researchers?|findings?)/i.test(normalized);
  const opinionOnly = /(says|said|tells|told|urges|advises|interview|podcast|opinion)/i.test(normalized);

  if (!communityShowcase && !researchOnly && !opinionOnly && /(launch|release|ships|rolls out|rollout|preview|general availability|now available)/i.test(normalized)) {
    categories.add(/model|llm|claude|gpt|gemini|llama|grok|reasoning/i.test(normalized) ? "model-release" : "product-launch");
  }

  if (hasPartnershipSignal(normalized)) {
    categories.add("partnership");
  }

  if (hasAcquisitionSignal(normalized)) {
    categories.add("acquisition");
  }

  if (/(funding|valuation|raises|financing|round)/i.test(normalized)) {
    categories.add("funding");
  }

  if (/(research|paper|study|preprint|researchers?|findings?)/i.test(normalized)) {
    categories.add("research");
  }

  if (/(benchmark|eval|evaluation|leaderboard|score)/i.test(normalized)) {
    categories.add("benchmark");
  }

  if (/(policy|regulation|complaint|act|rule|export control)/i.test(normalized)) {
    categories.add("policy-regulation");
  }

  if (hasInfrastructureSignal(normalized)) {
    categories.add("infrastructure");
  }

  if (/(appoints|hires|recruits|poaches|steps down|joins from|former .* joins|advisory|chief|executive|leadership|talent)/i.test(normalized)) {
    categories.add("leadership");
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

  if (/(churn|pressure|complaint|setback|delay|risk|steps down|cuts|concern|lawsuit|fine|ban)/i.test(normalized)) {
    return "negative";
  }

  if (/(launch|release|ships|wins|agreement|expands|opens|general availability|hires|recruits|raises)/i.test(normalized)) {
    return "positive";
  }

  return "neutral";
}

export function normalizeIngestedItem(item: RawIngestedItem): NormalizedCandidate | null {
  const title = sanitizeEditorialText(item.title);
  const excerpt = sanitizeEditorialText(item.excerpt);
  const rawText = sanitizeEditorialText(item.rawText);
  const text = `${title} ${excerpt}`.trim();
  const cleanedText = cleanText(excerpt || rawText);
  const companySlugs = detectCompanies(text, item.companyHint);
  const categorySlugs = detectCategories(text);
  const tagSlugs = detectTags(text);
  const canonicalUrl = canonicalizeUrl(item.url);
  const titleFingerprint = buildTitleFingerprint(title);
  const slugSuffix = createHash("sha1").update(canonicalUrl || `${item.sourceId}:${title}`).digest("hex").slice(0, 8);
  const inferredPrimaryCompany = inferPrimaryCompanySlug({
    headline: title,
    body: `${excerpt} ${rawText}`.trim(),
    sourceName: item.sourceName,
    sourceUrl: canonicalUrl || item.url,
    companyHint: item.companyHint,
  });
  const rankedCompanySlugs = rankCompanySlugsByStoryContext(
    inferredPrimaryCompany ? [...companySlugs, inferredPrimaryCompany] : companySlugs,
    {
      headline: title,
      body: `${excerpt} ${rawText}`.trim(),
      sourceName: item.sourceName,
      sourceUrl: canonicalUrl || item.url,
      companyHint: item.companyHint,
    },
  );
  const resolvedCompanySlugs = filterCompanySlugsByStoryContext(rankedCompanySlugs, {
    headline: title,
    body: `${excerpt} ${rawText}`.trim(),
    sourceName: item.sourceName,
    sourceUrl: canonicalUrl || item.url,
    companyHint: item.companyHint,
  });

  if (!title) {
    return null;
  }

  return {
    headline: title,
    slug: `${slugify(title)}-${slugSuffix}`,
    sourceName: sanitizeEditorialText(item.sourceName),
    sourceUrl: canonicalUrl || item.url,
    sourceId: item.sourceId,
    canonicalUrl: canonicalUrl || item.url,
    titleFingerprint,
    publishedAt: item.publishedAt ?? item.fetchedAt,
    rawText: rawText || null,
    cleanedText: cleanedText || null,
    impactDirection: detectImpactDirection(text),
    companySlugs: resolvedCompanySlugs,
    categorySlugs,
    tagSlugs,
    significanceSignals: [...categorySlugs, ...tagSlugs].slice(0, 6),
  };
}
