import { companiesBySlug } from "@/lib/seed/data";

import type { ScoredCandidate } from "@/lib/ingestion/types";

function firstSentence(text?: string | null) {
  if (!text) {
    return "";
  }

  const match = text.match(/(.+?[.!?])(\s|$)/);
  return (match?.[1] ?? text).trim();
}

function buildWhyItMatters(candidate: ScoredCandidate) {
  if (candidate.categorySlugs.includes("model-release")) {
    return "Model launches reshape the pace of the leaderboard because they force rivals to answer on capability and rollout speed.";
  }

  if (candidate.categorySlugs.includes("partnership")) {
    return "Commercial partnerships matter because they turn model quality into distribution and revenue signal.";
  }

  if (candidate.categorySlugs.includes("infrastructure")) {
    return "Infrastructure updates matter because AI momentum depends on who can actually train and serve models at scale.";
  }

  if (candidate.categorySlugs.includes("policy-regulation")) {
    return "Policy stories matter because compliance friction can slow adoption even when the technology is improving.";
  }

  return "This matters because it changes how the market reads current momentum, execution, or adoption.";
}

export async function summarizeCandidate(candidate: ScoredCandidate) {
  const primaryCompany = candidate.companySlugs[0] ? companiesBySlug[candidate.companySlugs[0]]?.name : undefined;
  const factualSentence =
    firstSentence(candidate.cleanedText) ||
    `${primaryCompany ?? "A tracked company"} announced an update through ${candidate.sourceName}.`;
  const whyItMatters = buildWhyItMatters(candidate);
  const uncertaintySentence =
    candidate.confidenceScore < 6 ? "Some details remain provisional and should be verified against additional reporting." : "";

  return {
    summary: [candidate.headline, factualSentence, whyItMatters, uncertaintySentence]
      .filter(Boolean)
      .slice(0, 4)
      .join(" "),
    shortSummary: candidate.headline,
    whyItMatters,
  };
}
