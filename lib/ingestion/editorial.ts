import { companiesBySlug } from "../seed/data.ts";

import { companyKeywordMap, matchesAnyKeyword } from "./keywords.ts";
import type { NormalizedCandidate, RawIngestedItem, SourceTier } from "./types.ts";

const CATEGORY_PRIORITY = [
  "model-release",
  "product-launch",
  "funding",
  "partnership",
  "infrastructure",
  "policy-regulation",
  "leadership",
  "research",
  "benchmark",
  "controversy",
] as const;

const HIGH_CONFIDENCE_CATEGORIES = new Set([
  "model-release",
  "product-launch",
  "funding",
  "partnership",
  "infrastructure",
  "policy-regulation",
  "leadership",
]);

const COMMUNITY_TITLE_PATTERNS = [/^show hn\b/i, /^ask hn\b/i, /^tell hn\b/i];
const COMMUNITY_PROJECT_PATTERN =
  /\b(client library|sdk|wrapper|bindings|plugin|starter|template|boilerplate|demo|sample app|side project|weekend project|tooling|visualqa|ollama client|cli)\b/i;
const OPINION_PATTERN = /\b(says|said|tells|told|urges|urged|advises|advised|comments on|commented on|argues|believes|thinks|predicts|reacts to|interview|podcast)\b/i;
const RESEARCH_PATTERN = /\b(arxiv|paper|preprint|researchers?|study|technical report|working paper)\b/i;
const BENCHMARK_PATTERN = /\b(benchmark|benchmarks|eval|evals|evaluation|leaderboard|scores?|scored)\b/i;
const FUNDING_PATTERN = /\b(funding|raises|raised|financing|valuation|series [a-z]|seed round)\b/i;
const PARTNERSHIP_PATTERN = /\b(partner|partnership|agreement|deal|distribution deal|joint venture|integrates with|rollout with)\b/i;
const ACQUISITION_PATTERN = /\b(acquires|acquisition|acquire|merger|merges with|buyout|takes stake)\b/i;
const LEADERSHIP_PATTERN =
  /\b(appoints|appointed|hires|hired|names|named|joins as|steps down|stepping down|resigns|resignation|chief executive|ceo|cto|leadership)\b/i;
const POLICY_PATTERN = /\b(policy|regulation|regulatory|complaint|antitrust|rule|rules|law|export control|compliance|ban)\b/i;
const INFRASTRUCTURE_PATTERN =
  /\b(data center|cluster|capacity|training cluster|gpu|gpus|accelerator|silicon|chip|chips|inference capacity|server racks?)\b/i;
const MODEL_PATTERN = /\b(model|llm|gpt|claude|gemini|llama|grok|frontier model|foundation model|reasoning model)\b/i;
const COMMERCIAL_ROLLOUT_PATTERN =
  /\b(now available|general availability|ga\b|for customers|for developers|enterprise customers?|pricing|priced|subscription|api|rolls out|rolled out|launches|launched|announces|announced|releases|released|ships|shipping|available in)\b/i;
const PRODUCT_SIGNAL_PATTERN = /\b(api|assistant|app|feature|platform|agent|workspace|studio|service|product)\b/i;
const NEGATIVE_SIGNAL_PATTERN = /\b(setback|delay|delays|risk|probe|complaint|cuts|reduction|lawsuit|fine|ban|pressure)\b/i;
const GITHUB_HOST_PATTERN = /(^|\.)github\.com$/i;
const ARXIV_HOST_PATTERN = /(^|\.)arxiv\.org$/i;
const HN_HOST_PATTERN = /(^|\.)news\.ycombinator\.com$/i;
const REDDIT_HOST_PATTERN = /(^|\.)reddit\.com$/i;
const RESEARCH_TAG_BLOCKLIST = new Set(["pricing", "enterprise", "api"]);
const LOW_SIGNAL_TAG_BLOCKLIST = new Set(["pricing", "enterprise", "api", "benchmarks"]);

export type EditorialDecision = {
  candidate: NormalizedCandidate;
  sourceTier: SourceTier;
  publishable: boolean;
  digestEligible: boolean;
  whyItMattersEligible: boolean;
  reviewFlags: string[];
  importanceCap: number;
  confidenceAdjustment: number;
  classificationConfidence: number;
  suppressionReason: string | null;
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function inferSourceTier(rawItem: RawIngestedItem) {
  const hostname = hostnameFromUrl(rawItem.url);
  const sourceName = rawItem.sourceName.toLowerCase();
  const sourceId = rawItem.sourceId.toLowerCase();

  if (sourceId.includes("manual")) {
    return "manual";
  }

  if (rawItem.companyHint) {
    return "official";
  }

  if (sourceId.includes("hacker-news") || sourceId.includes("reddit") || HN_HOST_PATTERN.test(hostname) || REDDIT_HOST_PATTERN.test(hostname)) {
    return "community";
  }

  if (sourceId.includes("arxiv") || ARXIV_HOST_PATTERN.test(hostname)) {
    return "research-repository";
  }

  if (rawItem.sourcePriority <= 1 && rawItem.sourceReliability >= 0.84) {
    return "major-media";
  }

  if (sourceName.includes("blog") || rawItem.sourceReliability >= 0.8) {
    return "trade-media";
  }

  return "community";
}

function headlineMentionsCompany(headline: string, slug: string) {
  const keywords = companyKeywordMap[slug];

  if (!keywords) {
    return false;
  }

  return matchesAnyKeyword(headline, keywords);
}

function orderCategories(values: Iterable<string>) {
  const set = new Set(values);

  return CATEGORY_PRIORITY.filter((slug) => set.has(slug));
}

function pruneCompanyAssociations(candidate: NormalizedCandidate, headline: string, restrictToSingleCompany: boolean) {
  const headlineCompanies = candidate.companySlugs.filter((slug) => headlineMentionsCompany(headline, slug));

  if (headlineCompanies.length > 0) {
    return restrictToSingleCompany ? headlineCompanies.slice(0, 1) : headlineCompanies.slice(0, 2);
  }

  return restrictToSingleCompany ? candidate.companySlugs.slice(0, 1) : candidate.companySlugs.slice(0, 2);
}

export function applyEditorialRules(candidate: NormalizedCandidate, rawItem: RawIngestedItem): EditorialDecision {
  const headline = candidate.headline.trim();
  const sourceTier = inferSourceTier(rawItem);
  const combinedText = `${headline} ${candidate.cleanedText ?? candidate.rawText ?? ""}`.trim();
  const hostname = hostnameFromUrl(candidate.canonicalUrl || rawItem.url);
  const showHn = COMMUNITY_TITLE_PATTERNS.some((pattern) => pattern.test(headline));
  const openSourceDevTool = COMMUNITY_PROJECT_PATTERN.test(combinedText);
  const opinionOnly =
    OPINION_PATTERN.test(headline) &&
    !FUNDING_PATTERN.test(headline) &&
    !PARTNERSHIP_PATTERN.test(headline) &&
    !ACQUISITION_PATTERN.test(headline) &&
    !LEADERSHIP_PATTERN.test(headline) &&
    !POLICY_PATTERN.test(headline) &&
    !COMMERCIAL_ROLLOUT_PATTERN.test(headline);
  const researchSignal = RESEARCH_PATTERN.test(combinedText) || sourceTier === "research-repository";
  const benchmarkSignal = BENCHMARK_PATTERN.test(combinedText);
  const fundingSignal = FUNDING_PATTERN.test(combinedText);
  const partnershipSignal = PARTNERSHIP_PATTERN.test(combinedText) || ACQUISITION_PATTERN.test(combinedText);
  const leadershipSignal = LEADERSHIP_PATTERN.test(combinedText);
  const policySignal = POLICY_PATTERN.test(combinedText);
  const infrastructureSignal = INFRASTRUCTURE_PATTERN.test(combinedText);
  const modelSignal = MODEL_PATTERN.test(combinedText);
  const productSignal = PRODUCT_SIGNAL_PATTERN.test(combinedText);
  const commercialRolloutSignal = COMMERCIAL_ROLLOUT_PATTERN.test(combinedText);
  const officialSource = sourceTier === "official";
  const githubProject = GITHUB_HOST_PATTERN.test(hostname);
  const communityShowcase = (sourceTier === "community" && showHn) || (sourceTier === "community" && openSourceDevTool);
  const researchOnly =
    researchSignal &&
    !commercialRolloutSignal &&
    !partnershipSignal &&
    !fundingSignal &&
    !policySignal &&
    !leadershipSignal &&
    !infrastructureSignal;

  const reviewFlags: string[] = [];
  const categories = new Set<string>();
  let companySlugs = unique(candidate.companySlugs);
  let tagSlugs = unique(candidate.tagSlugs);
  let impactDirection = candidate.impactDirection;
  let importanceCap = 8;
  let confidenceAdjustment = 0;
  let classificationConfidence = 6;
  let suppressionReason: string | null = null;

  if (officialSource) {
    companySlugs = unique([rawItem.companyHint ?? "", ...companySlugs].filter(Boolean));
    importanceCap = 9;
    confidenceAdjustment += 2;
    classificationConfidence += 2;
  }

  if (sourceTier === "major-media") {
    confidenceAdjustment += 1;
    classificationConfidence += 1;
  }

  if (sourceTier === "trade-media") {
    classificationConfidence += 1;
  }

  if (sourceTier === "research-repository") {
    importanceCap = Math.min(importanceCap, 4);
    confidenceAdjustment -= 1;
  }

  if (sourceTier === "community") {
    importanceCap = Math.min(importanceCap, 3);
    confidenceAdjustment -= 2;
  }

  if (fundingSignal) {
    categories.add("funding");
    classificationConfidence += 2;
  }

  if (partnershipSignal) {
    categories.add("partnership");
    classificationConfidence += 2;
  }

  if (leadershipSignal) {
    categories.add("leadership");
    classificationConfidence += 2;
  }

  if (policySignal) {
    categories.add("policy-regulation");
    classificationConfidence += 2;
  }

  if (infrastructureSignal) {
    categories.add("infrastructure");
    classificationConfidence += 2;
  }

  if (benchmarkSignal) {
    categories.add("benchmark");
    classificationConfidence += 1;
  }

  if (researchSignal) {
    categories.add("research");
    classificationConfidence += 1;
  }

  if (commercialRolloutSignal && !communityShowcase && !opinionOnly && !researchOnly) {
    if (modelSignal) {
      categories.add("model-release");
      classificationConfidence += 3;
    } else if (productSignal || officialSource) {
      categories.add("product-launch");
      classificationConfidence += 2;
    }
  }

  if (communityShowcase) {
    suppressionReason = "community-showcase";
    importanceCap = Math.min(importanceCap, showHn ? 2 : 3);
    classificationConfidence = Math.min(classificationConfidence, 4);
    reviewFlags.push(showHn ? "show-hn-capped" : "community-dev-tool");
  }

  if (githubProject && !officialSource) {
    suppressionReason = suppressionReason ?? "unverified-github-project";
    importanceCap = Math.min(importanceCap, 2);
    classificationConfidence = Math.min(classificationConfidence, 4);
    reviewFlags.push("github-project");
  }

  if (opinionOnly) {
    suppressionReason = suppressionReason ?? "opinion-without-news";
    importanceCap = Math.min(importanceCap, 3);
    classificationConfidence = Math.min(classificationConfidence, 4);
    reviewFlags.push("opinion-not-activity");
  }

  if (researchOnly) {
    importanceCap = Math.min(importanceCap, 4);
    reviewFlags.push("research-only");
  }

  if (benchmarkSignal && !commercialRolloutSignal) {
    importanceCap = Math.min(importanceCap, 4);
    reviewFlags.push("benchmark-without-rollout");
  }

  if (candidate.companySlugs.length > 1 && !partnershipSignal && !fundingSignal && !policySignal && !leadershipSignal) {
    companySlugs = pruneCompanyAssociations(candidate, headline, sourceTier === "community" || sourceTier === "research-repository");
    reviewFlags.push("company-association-pruned");
    classificationConfidence -= 1;
  }

  if (communityShowcase || researchOnly || opinionOnly) {
    companySlugs = pruneCompanyAssociations({ ...candidate, companySlugs }, headline, true);
    tagSlugs = tagSlugs.filter((tag) => !LOW_SIGNAL_TAG_BLOCKLIST.has(tag)).slice(0, 2);
  } else if (researchOnly || sourceTier === "research-repository") {
    tagSlugs = tagSlugs.filter((tag) => !RESEARCH_TAG_BLOCKLIST.has(tag)).slice(0, 2);
  } else {
    tagSlugs = tagSlugs.slice(0, 4);
  }

  if (officialSource && rawItem.companyHint && !partnershipSignal && !fundingSignal && !policySignal) {
    companySlugs = unique([rawItem.companyHint]).slice(0, 1);
  }

  if (companySlugs.length === 0 && HIGH_CONFIDENCE_CATEGORIES.has(orderCategories(categories)[0] ?? "")) {
    reviewFlags.push("missing-company-association");
    classificationConfidence -= 1;
  }

  if (NEGATIVE_SIGNAL_PATTERN.test(combinedText)) {
    impactDirection = "negative";
  } else if (communityShowcase || opinionOnly || researchOnly || benchmarkSignal) {
    impactDirection = "neutral";
  }

  const orderedCategories = orderCategories(categories);

  if (orderedCategories.length === 0 && !suppressionReason && sourceTier === "community") {
    suppressionReason = "low-signal-community";
  }

  if (orderedCategories.includes("research") && !orderedCategories.some((slug) => HIGH_CONFIDENCE_CATEGORIES.has(slug))) {
    classificationConfidence = Math.min(classificationConfidence, 6);
  }

  classificationConfidence = Math.max(1, Math.min(10, classificationConfidence));

  const digestEligible =
    !suppressionReason &&
    importanceCap >= 5 &&
    classificationConfidence >= 6 &&
    orderedCategories.some((slug) => HIGH_CONFIDENCE_CATEGORIES.has(slug)) &&
    companySlugs.length > 0;
  const whyItMattersEligible =
    digestEligible &&
    classificationConfidence >= 7 &&
    !orderedCategories.every((slug) => slug === "research" || slug === "benchmark");

  return {
    candidate: {
      ...candidate,
      companySlugs,
      categorySlugs: orderedCategories.length > 0 ? orderedCategories : candidate.categorySlugs.slice(0, 1),
      tagSlugs,
      impactDirection,
      significanceSignals: unique([
        ...orderedCategories,
        ...tagSlugs,
        sourceTier,
        ...reviewFlags,
        ...companySlugs.map((slug) => companiesBySlug[slug]?.shortName ?? slug.toUpperCase()),
      ]).slice(0, 8),
    },
    sourceTier,
    publishable: !suppressionReason,
    digestEligible,
    whyItMattersEligible,
    reviewFlags: unique(reviewFlags),
    importanceCap,
    confidenceAdjustment,
    classificationConfidence,
    suppressionReason,
  };
}

export function inferSourceTierFromStory(sourceName: string, sourceUrl: string) {
  return inferSourceTier({
    sourceId: sourceName.toLowerCase().replace(/\s+/g, "-"),
    sourceName,
    sourceUrl,
    sourceReliability: 0.8,
    sourcePriority: 2,
    url: sourceUrl,
    title: "",
    fetchedAt: new Date().toISOString(),
  });
}
