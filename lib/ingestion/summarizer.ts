import { companiesBySlug } from "../seed/data.ts";
import { extractFirstJsonObject } from "../llm/json.ts";
import { generateLlmText, getConfiguredModel, isLlmConfigured } from "../llm/openai.ts";

import type { ScoredCandidate } from "./types.ts";

type SummaryFields = {
  summary: string;
  shortSummary: string;
  whyItMatters: string;
};

const MAX_LLM_CALLS_PER_RUN = 30;

let llmCallsThisRun = 0;
const runCache = new Map<string, SummaryFields>();

function firstSentence(text?: string | null) {
  if (!text) {
    return "";
  }

  const match = text.match(/(.+?[.!?])(\s|$)/);
  return (match?.[1] ?? text).trim();
}

function buildWhyItMatters(candidate: ScoredCandidate) {
  if (candidate.categorySlugs.includes("model-release")) {
    return "Model launches reshape the race because they force rivals to answer on capability, distribution, and rollout speed.";
  }

  if (candidate.categorySlugs.includes("partnership")) {
    return "Commercial partnerships matter because they convert technical progress into distribution, customers, and revenue signal.";
  }

  if (candidate.categorySlugs.includes("infrastructure")) {
    return "Infrastructure updates matter because AI momentum depends on who can actually train and serve models at scale.";
  }

  if (candidate.categorySlugs.includes("policy-regulation")) {
    return "Policy stories matter because compliance friction can slow adoption even when model quality keeps improving.";
  }

  return "This matters because it changes how the market reads current momentum, execution quality, or adoption potential.";
}

function fallbackSummary(candidate: ScoredCandidate): SummaryFields {
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
    shortSummary: candidate.headline.slice(0, 120),
    whyItMatters,
  };
}

function sanitizeSummaryFields(fields: Partial<SummaryFields>, fallback: SummaryFields): SummaryFields {
  return {
    summary: typeof fields.summary === "string" && fields.summary.trim() ? fields.summary.trim() : fallback.summary,
    shortSummary:
      typeof fields.shortSummary === "string" && fields.shortSummary.trim()
        ? fields.shortSummary.trim().slice(0, 120)
        : fallback.shortSummary,
    whyItMatters:
      typeof fields.whyItMatters === "string" && fields.whyItMatters.trim() ? fields.whyItMatters.trim() : fallback.whyItMatters,
  };
}

export function resetSummarizerRunState() {
  llmCallsThisRun = 0;
  runCache.clear();
}

async function generateLlmSummary(candidate: ScoredCandidate) {
  const companyNames = candidate.companySlugs.map((slug) => companiesBySlug[slug]?.name ?? slug).filter(Boolean);
  const model = getConfiguredModel();
  const response = await generateLlmText({
    systemPrompt: `You write for The AI Company Tracker, an editorial product about the AI industry.

Be concise, analytical, and grounded. No hype. State what happened first, then why it matters. Separate facts from interpretation. Flag uncertainty when needed.

Return only valid JSON with these keys:
- summary: 2-3 sentences
- shortSummary: 1 sentence, maximum 120 characters
- whyItMatters: 1-2 sentences on the strategic significance`,
    prompt: `Model: ${model}
Headline: ${candidate.headline}
Companies: ${companyNames.join(", ") || "Unknown"}
Categories: ${candidate.categorySlugs.join(", ") || "None"}
Tags: ${candidate.tagSlugs.join(", ") || "None"}
Impact: ${candidate.impactDirection}
Confidence: ${candidate.confidenceScore}/10
Source: ${candidate.sourceName}
Text: ${candidate.cleanedText ?? candidate.rawText ?? candidate.headline}`,
    temperature: 0.2,
    maxOutputTokens: 420,
  });

  return extractFirstJsonObject(response);
}

export async function summarizeCandidate(
  candidate: ScoredCandidate,
  options?: {
    existingSummary?: SummaryFields | null;
  },
): Promise<SummaryFields> {
  if (options?.existingSummary?.summary && options.existingSummary.shortSummary && options.existingSummary.whyItMatters) {
    return options.existingSummary;
  }

  const cached = runCache.get(candidate.slug);

  if (cached) {
    return cached;
  }

  const fallback = fallbackSummary(candidate);

  if (!isLlmConfigured() || llmCallsThisRun >= MAX_LLM_CALLS_PER_RUN) {
    runCache.set(candidate.slug, fallback);
    return fallback;
  }

  try {
    llmCallsThisRun += 1;
    const result = sanitizeSummaryFields((await generateLlmSummary(candidate)) as Partial<SummaryFields>, fallback);
    runCache.set(candidate.slug, result);
    return result;
  } catch {
    runCache.set(candidate.slug, fallback);
    return fallback;
  }
}
