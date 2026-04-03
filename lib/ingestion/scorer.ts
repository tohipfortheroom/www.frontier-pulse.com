import type { NormalizedCandidate, RawIngestedItem } from "./types.ts";

function clamp(value: number, min = 1, max = 10) {
  return Math.max(min, Math.min(max, value));
}

export function scoreCandidate(candidate: NormalizedCandidate, rawItem: RawIngestedItem) {
  let importanceScore = 4;
  let confidenceScore = Math.round((rawItem.sourceReliability ?? 0.75) * 10);

  if ((rawItem.sourcePriority ?? 2) === 1) {
    confidenceScore += 1;
  }

  if (rawItem.sourceId.includes("manual")) {
    confidenceScore = Math.min(confidenceScore, 6);
  }

  if (candidate.categorySlugs.includes("model-release")) {
    importanceScore += 3;
  }

  if (candidate.categorySlugs.includes("product-launch")) {
    importanceScore += 2;
  }

  if (candidate.categorySlugs.includes("partnership") || candidate.categorySlugs.includes("funding")) {
    importanceScore += 2;
  }

  if (candidate.categorySlugs.includes("infrastructure")) {
    importanceScore += 2;
  }

  if (candidate.categorySlugs.includes("policy-regulation") || candidate.categorySlugs.includes("leadership")) {
    importanceScore += 1;
  }

  if (candidate.companySlugs.length > 0) {
    confidenceScore += 1;
  }

  if (candidate.tagSlugs.includes("benchmarks") || candidate.tagSlugs.includes("reasoning")) {
    importanceScore += 1;
  }

  const lowerHeadline = candidate.headline.toLowerCase();

  if (/(reportedly|rumor|rumoured|said to|explores)/i.test(lowerHeadline)) {
    confidenceScore -= 2;
  }

  if (candidate.impactDirection === "negative") {
    importanceScore += 1;
  }

  return {
    importanceScore: clamp(importanceScore),
    confidenceScore: clamp(confidenceScore),
  };
}
