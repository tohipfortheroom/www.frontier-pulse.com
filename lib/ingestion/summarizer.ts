import { categories, companiesBySlug, type ImpactDirection } from "../seed/data.ts";
import { BRAND_NAME } from "../brand.ts";
import { extractFirstJsonObject } from "../llm/json.ts";
import {
  generateLlmText,
  getConfiguredModel,
  getConfiguredProvider,
  isLlmConfigured,
} from "../llm/openai.ts";
import { logger } from "../monitoring/logger.ts";

import type { ScoredCandidate } from "./types.ts";

type SummaryFields = {
  summary: string;
  shortSummary: string;
  whyItMatters: string;
  categorySlugs: string[];
  tagSlugs: string[];
  impactDirection: ImpactDirection;
  importanceScore: number;
  summarizerModel: string | null;
};

type ExistingSummaryFields = Pick<SummaryFields, "summary" | "shortSummary" | "whyItMatters" | "summarizerModel">;

const MAX_LLM_CALLS_PER_RUN = 30;
const CATEGORY_SLUGS = new Set(categories.map((category) => category.slug));
const TAG_LIMIT = 5;
const WHY_IT_MATTERS_BANNED_PATTERNS = [
  /this matters because/i,
  /changes how the market reads/i,
  /execution quality/i,
  /adoption potential/i,
  /reshap(es|e) the race/i,
  /force(s|d)? rivals to answer/i,
  /market momentum/i,
  /industry significance/i,
];
const SUMMARY_BANNED_PATTERNS = [/this update/i, /the story highlights/i, /the news underscores/i];
const CATEGORY_ALIASES: Record<string, string> = {
  regulation: "policy-regulation",
  executive: "leadership",
  benchmark: "benchmark",
  controversy: "controversy",
  "product-launch": "product-launch",
  "model-release": "model-release",
  funding: "funding",
  partnership: "partnership",
  research: "research",
  infrastructure: "infrastructure",
  leadership: "leadership",
  "policy-regulation": "policy-regulation",
};

let llmCallsThisRun = 0;
let lastLlmCallAt = 0;
const runCache = new Map<string, SummaryFields>();

function clamp(value: number, min = 1, max = 10) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstSentence(text?: string | null) {
  if (!text) {
    return "";
  }

  const match = text.match(/(.+?[.!?])(\s|$)/);
  return (match?.[1] ?? text).trim();
}

function getImportanceTier(score: number) {
  if (score >= 8) {
    return "critical";
  }

  if (score >= 6) {
    return "high";
  }

  if (score >= 4) {
    return "medium";
  }

  return "low";
}

function normalizeSentence(text?: string | null, maxLength = 220) {
  if (!text) {
    return "";
  }

  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isHeadlineRestatement(headline: string, text: string) {
  const normalizedHeadline = headline.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (!normalizedHeadline || !normalizedText) {
    return false;
  }

  return normalizedText === normalizedHeadline || normalizedText.startsWith(normalizedHeadline);
}

function shouldShowWhyItMatters(candidate: ScoredCandidate) {
  return Boolean(candidate.whyItMattersEligible) && candidate.importanceScore >= 6 && candidate.confidenceScore >= 7;
}

function isGenericWhyItMatters(text: string) {
  return WHY_IT_MATTERS_BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

function isWeakSummary(text: string, headline: string) {
  return !text || SUMMARY_BANNED_PATTERNS.some((pattern) => pattern.test(text)) || isHeadlineRestatement(headline, text);
}

function sanitizeWhyItMatters(text: string, candidate: ScoredCandidate) {
  const normalized = normalizeSentence(text, 220);

  if (!normalized || !shouldShowWhyItMatters(candidate) || isGenericWhyItMatters(normalized)) {
    return "";
  }

  const primaryCompany = candidate.companySlugs[0] ? companiesBySlug[candidate.companySlugs[0]]?.name : "";
  const hasSpecificAnchor =
    Boolean(primaryCompany && normalized.toLowerCase().includes(primaryCompany.toLowerCase())) ||
    candidate.tagSlugs.some((tag) => normalized.toLowerCase().includes(tag.replace(/-/g, " "))) ||
    normalized.toLowerCase().includes(candidate.categorySlugs[0]?.replace(/-/g, " ") ?? "");

  return hasSpecificAnchor ? normalized : "";
}

function buildFallbackWhyItMatters(candidate: ScoredCandidate) {
  if (!shouldShowWhyItMatters(candidate)) {
    return "";
  }

  const companyName = candidate.companySlugs[0] ? companiesBySlug[candidate.companySlugs[0]]?.name : null;

  if (candidate.categorySlugs.includes("partnership") && companyName) {
    return `${companyName} now has a named distribution or customer path, which is stronger than AI interest without a commercial channel.`;
  }

  if (candidate.categorySlugs.includes("funding") && companyName) {
    return `${companyName} has more capacity to hire, buy compute, or expand product rollout after this financing move.`;
  }

  if (candidate.categorySlugs.includes("policy-regulation") && companyName) {
    return `This can change launch timing, compliance costs, or regional distribution for ${companyName}.`;
  }

  if (candidate.categorySlugs.includes("infrastructure") && companyName) {
    return `This affects how quickly ${companyName} can train, serve, or scale AI products in the market.`;
  }

  return "";
}

function fallbackSummary(candidate: ScoredCandidate): SummaryFields {
  const tier = getImportanceTier(candidate.importanceScore);
  const sourceSentence = normalizeSentence(firstSentence(candidate.cleanedText) || firstSentence(candidate.rawText));
  const leadSentence = sourceSentence && !isHeadlineRestatement(candidate.headline, sourceSentence) ? sourceSentence : candidate.headline;
  const uncertaintySentence = candidate.confidenceScore < 6 ? "Details remain thin, so this item is being kept factual and lightly scored." : "";
  const whyItMatters = sanitizeWhyItMatters(buildFallbackWhyItMatters(candidate), candidate);
  const summarySentences =
    tier === "critical" || tier === "high"
      ? [leadSentence, uncertaintySentence].filter(Boolean)
      : tier === "medium"
        ? [leadSentence]
        : [normalizeSentence(leadSentence, 160)];
  const summary = summarySentences.join(" ").trim();
  const shortSummary = normalizeSentence(summary || candidate.headline, 120);

  return {
    summary: summary || candidate.headline,
    shortSummary: shortSummary || candidate.headline.slice(0, 120),
    whyItMatters,
    categorySlugs: candidate.categorySlugs,
    tagSlugs: candidate.tagSlugs,
    impactDirection: candidate.impactDirection,
    importanceScore: candidate.importanceScore,
    summarizerModel: null,
  };
}

function normalizeCategorySlug(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  const mapped = CATEGORY_ALIASES[normalized] ?? normalized;
  return CATEGORY_SLUGS.has(mapped) ? mapped : null;
}

function normalizeTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeUnique(values: string[], fallbackValues: string[], limit: number) {
  return Array.from(new Set([...values, ...fallbackValues])).slice(0, limit);
}

function mergeExistingSummary(fallback: SummaryFields, existingSummary?: ExistingSummaryFields | null): SummaryFields {
  if (!existingSummary?.summary || !existingSummary.shortSummary) {
    return fallback;
  }

  return {
    ...fallback,
    summary: existingSummary.summary,
    shortSummary: existingSummary.shortSummary,
    whyItMatters: existingSummary.whyItMatters ?? fallback.whyItMatters,
    summarizerModel: existingSummary.summarizerModel ?? fallback.summarizerModel,
  };
}

function sanitizeSummaryFields(fields: Partial<SummaryFields>, fallback: SummaryFields, candidate: ScoredCandidate): SummaryFields {
  const summaryCandidate = typeof fields.summary === "string" ? normalizeSentence(fields.summary, 420) : "";
  const shortSummaryCandidate = typeof fields.shortSummary === "string" ? normalizeSentence(fields.shortSummary, 120) : "";
  const whyItMattersCandidate = typeof fields.whyItMatters === "string" ? normalizeSentence(fields.whyItMatters, 220) : "";

  return {
    summary: summaryCandidate && !isWeakSummary(summaryCandidate, fallback.shortSummary) ? summaryCandidate : fallback.summary,
    shortSummary:
      shortSummaryCandidate && !isHeadlineRestatement(fallback.summary, shortSummaryCandidate)
        ? shortSummaryCandidate
        : fallback.shortSummary,
    whyItMatters: sanitizeWhyItMatters(whyItMattersCandidate, candidate) || fallback.whyItMatters,
    categorySlugs: fallback.categorySlugs,
    tagSlugs: fallback.tagSlugs,
    impactDirection: fallback.impactDirection,
    importanceScore: fallback.importanceScore,
    summarizerModel: fields.summarizerModel ?? fallback.summarizerModel,
  };
}

export function resetSummarizerRunState() {
  llmCallsThisRun = 0;
  lastLlmCallAt = 0;
  runCache.clear();
}

export async function summarizeWithLLM(candidate: ScoredCandidate) {
  const companyNames = candidate.companySlugs.map((slug) => companiesBySlug[slug]?.name ?? slug).filter(Boolean);
  const model = getConfiguredModel();
  const provider = getConfiguredProvider();
  const delayMs = Math.max(0, Number(process.env.SUMMARIZER_DELAY_MS ?? 500));
  const elapsed = Date.now() - lastLlmCallAt;

  if (lastLlmCallAt > 0 && elapsed < delayMs) {
    await sleep(delayMs - elapsed);
  }

  const startedAt = Date.now();
  const tier = getImportanceTier(candidate.importanceScore);
  const response = await generateLlmText({
    systemPrompt: `You write for ${BRAND_NAME}, an editorial product about the AI industry.

Be concise, factual, and grounded in the source text. No hype. Do not reclassify the story. Do not change its score, tags, companies, or category. If the source does not support a specific why-it-matters sentence, return an empty string for whyItMatters.

Return only valid JSON with these keys:
- summary
- shortSummary
- whyItMatters`,
    prompt: `Provider: ${provider}
Model: ${model}
Headline: ${candidate.headline}
Companies: ${companyNames.join(", ") || "Unknown"}
Categories: ${candidate.categorySlugs.join(", ") || "none"}
Tags: ${candidate.tagSlugs.join(", ") || "none"}
Impact direction: ${candidate.impactDirection}
Importance score: ${candidate.importanceScore}
Importance tier: ${tier}
Confidence: ${candidate.confidenceScore}/10
Source: ${candidate.sourceName}
Source URL: ${candidate.sourceUrl}
Raw text: ${candidate.cleanedText ?? candidate.rawText ?? candidate.headline}

Requirements:
- summary must be specific to this event and never repeat the headline verbatim.
- for critical/high items, summary should be 2 factual sentences.
- for medium items, summary should be 1 to 2 factual sentences.
- for low items, summary should be 1 short factual sentence.
- shortSummary must be a single sentence no longer than 120 characters.
- whyItMatters must be a single specific sentence tied to the actual event, or "" if the source is too thin.
- never use phrases like "this matters because", "reshapes the race", "execution quality", "adoption potential", or "market reads".
- never add facts that are not in the source text.`,
    temperature: 0.2,
    maxOutputTokens: 500,
  });

  lastLlmCallAt = Date.now();
  logger.info("llm", "summarizer_completed", {
    provider,
    model,
    slug: candidate.slug,
    latencyMs: Date.now() - startedAt,
    companySlugs: candidate.companySlugs,
  });

  return {
    ...(extractFirstJsonObject(response) as Partial<SummaryFields>),
    summarizerModel: model,
  };
}

export async function summarizeCandidate(
  candidate: ScoredCandidate,
  options?: {
    existingSummary?: ExistingSummaryFields | null;
    forceResummarize?: boolean;
  },
): Promise<SummaryFields> {
  const cacheKey = `${candidate.slug}:${options?.forceResummarize ? "force" : "normal"}`;
  const cached = runCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const fallback = mergeExistingSummary(fallbackSummary(candidate), options?.existingSummary);

  if (
    !options?.forceResummarize &&
    options?.existingSummary?.summary &&
    options.existingSummary.shortSummary &&
    typeof options.existingSummary.whyItMatters === "string"
  ) {
    runCache.set(cacheKey, fallback);
    return fallback;
  }

  const shouldUseLlm =
    isLlmConfigured() &&
    llmCallsThisRun < MAX_LLM_CALLS_PER_RUN &&
    candidate.importanceScore >= 6 &&
    candidate.confidenceScore >= 7 &&
    candidate.sourceTier !== "community";

  if (!shouldUseLlm) {
    runCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    llmCallsThisRun += 1;
    const result = sanitizeSummaryFields(await summarizeWithLLM(candidate), fallback, candidate);
    runCache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.warn("llm", "summarizer_fallback", {
      slug: candidate.slug,
      message: error instanceof Error ? error.message : "Unknown summarizer error",
    });
    runCache.set(cacheKey, fallback);
    return fallback;
  }
}
