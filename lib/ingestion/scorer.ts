import type { EditorialDecision } from "./editorial.ts";
import type { NormalizedCandidate, RawIngestedItem } from "./types.ts";

function clamp(value: number, min = 1, max = 10) {
  return Math.max(min, Math.min(max, value));
}

export function scoreCandidate(candidate: NormalizedCandidate, rawItem: RawIngestedItem, editorial?: EditorialDecision) {
  const primaryCategory = candidate.categorySlugs[0];
  let importanceScore = 2;

  switch (primaryCategory) {
    case "model-release":
      importanceScore = 8;
      break;
    case "product-launch":
      importanceScore = 7;
      break;
    case "funding":
      importanceScore = 7;
      break;
    case "partnership":
      importanceScore = 6;
      break;
    case "acquisition":
      importanceScore = 8;
      break;
    case "infrastructure":
      importanceScore = 6;
      break;
    case "policy-regulation":
      importanceScore = 5;
      break;
    case "leadership":
      importanceScore = 5;
      break;
    case "research":
      importanceScore = 4;
      break;
    case "benchmark":
      importanceScore = 3;
      break;
    case "controversy":
      importanceScore = 4;
      break;
    default:
      importanceScore = 3;
      break;
  }

  if (candidate.categorySlugs.includes("partnership") && candidate.categorySlugs.includes("infrastructure")) {
    importanceScore += 1;
  }

  if (candidate.categorySlugs.includes("funding") && candidate.categorySlugs.includes("infrastructure")) {
    importanceScore += 1;
  }

  if (candidate.impactDirection === "negative" && primaryCategory !== "research" && primaryCategory !== "benchmark") {
    importanceScore += 1;
  }

  if ((rawItem.sourcePriority ?? 2) === 1 && editorial?.sourceTier !== "community") {
    importanceScore += 1;
  }

  if (candidate.companySlugs.length === 0) {
    importanceScore -= 1;
  }

  if (candidate.tagSlugs.includes("reasoning") || candidate.tagSlugs.includes("chips")) {
    importanceScore += 1;
  }

  let confidenceScore = Math.round((rawItem.sourceReliability ?? 0.75) * 10);

  if (editorial?.sourceTier === "official") {
    confidenceScore = Math.max(confidenceScore, 9);
  }

  if (editorial?.sourceTier === "major-media") {
    confidenceScore = Math.max(confidenceScore, 8);
  }

  if (editorial?.sourceTier === "trade-media") {
    confidenceScore = Math.max(confidenceScore, 7);
  }

  if (editorial?.sourceTier === "research-repository") {
    confidenceScore = Math.min(confidenceScore, 7);
  }

  if (editorial?.sourceTier === "community") {
    confidenceScore = Math.min(confidenceScore, 5);
  }

  if (rawItem.sourceId.includes("manual")) {
    confidenceScore = Math.min(confidenceScore, 6);
  }

  if (candidate.companySlugs.length > 0) {
    confidenceScore += 1;
  }

  if (editorial?.classificationConfidence) {
    confidenceScore += Math.round((editorial.classificationConfidence - 5) / 2);
  }

  confidenceScore += editorial?.confidenceAdjustment ?? 0;

  const lowerHeadline = candidate.headline.toLowerCase();

  if (/(reportedly|rumor|rumoured|said to|explores|could|might)/i.test(lowerHeadline)) {
    confidenceScore -= 2;
  }

  if ((editorial?.reviewFlags?.length ?? 0) > 0) {
    confidenceScore -= 1;
  }

  if (editorial?.importanceCap) {
    importanceScore = Math.min(importanceScore, editorial.importanceCap);
  }

  return {
    importanceScore: clamp(importanceScore),
    confidenceScore: clamp(confidenceScore),
  };
}
