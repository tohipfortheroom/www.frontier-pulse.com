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

  if (candidate.categorySlugs.includes("controversy")) {
    return "Controversies matter because trust shocks can change buyer behavior faster than model quality can recover it.";
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
  if (!existingSummary?.summary || !existingSummary.shortSummary || !existingSummary.whyItMatters) {
    return fallback;
  }

  return {
    ...fallback,
    summary: existingSummary.summary,
    shortSummary: existingSummary.shortSummary,
    whyItMatters: existingSummary.whyItMatters,
    summarizerModel: existingSummary.summarizerModel ?? fallback.summarizerModel,
  };
}

function sanitizeSummaryFields(fields: Partial<SummaryFields>, fallback: SummaryFields): SummaryFields {
  const categoriesFromLlm = Array.isArray(fields.categorySlugs)
    ? fields.categorySlugs
        .map((value) => normalizeCategorySlug(String(value)))
        .filter((value): value is string => Boolean(value))
    : Array.isArray((fields as { categories?: unknown[] }).categories)
      ? ((fields as { categories?: unknown[] }).categories ?? [])
          .map((value) => normalizeCategorySlug(String(value)))
          .filter((value): value is string => Boolean(value))
      : [];
  const tagsFromLlm = Array.isArray(fields.tagSlugs)
    ? fields.tagSlugs.map((value) => normalizeTag(String(value))).filter((value): value is string => Boolean(value))
    : Array.isArray((fields as { tags?: unknown[] }).tags)
      ? ((fields as { tags?: unknown[] }).tags ?? [])
          .map((value) => normalizeTag(String(value)))
          .filter((value): value is string => Boolean(value))
      : [];
  const impactDirection =
    fields.impactDirection === "positive" || fields.impactDirection === "negative" || fields.impactDirection === "neutral"
      ? fields.impactDirection
      : typeof (fields as { impactDirection?: string }).impactDirection === "string" &&
          ["positive", "negative", "neutral"].includes(String((fields as { impactDirection?: string }).impactDirection))
        ? (fields as { impactDirection: ImpactDirection }).impactDirection
        : fallback.impactDirection;
  const importanceScoreRaw =
    typeof fields.importanceScore === "number"
      ? fields.importanceScore
      : typeof (fields as { importanceScore?: unknown }).importanceScore === "string"
        ? Number((fields as { importanceScore?: string }).importanceScore)
        : fallback.importanceScore;

  return {
    summary: typeof fields.summary === "string" && fields.summary.trim() ? fields.summary.trim() : fallback.summary,
    shortSummary:
      typeof fields.shortSummary === "string" && fields.shortSummary.trim()
        ? fields.shortSummary.trim().slice(0, 120)
        : fallback.shortSummary,
    whyItMatters:
      typeof fields.whyItMatters === "string" && fields.whyItMatters.trim() ? fields.whyItMatters.trim() : fallback.whyItMatters,
    categorySlugs:
      categoriesFromLlm.length > 0 ? mergeUnique(categoriesFromLlm, fallback.categorySlugs, 4) : fallback.categorySlugs,
    tagSlugs: tagsFromLlm.length > 0 ? mergeUnique(tagsFromLlm, fallback.tagSlugs, TAG_LIMIT) : fallback.tagSlugs,
    impactDirection,
    importanceScore: Number.isFinite(importanceScoreRaw) ? clamp(Math.round(importanceScoreRaw)) : fallback.importanceScore,
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
  const response = await generateLlmText({
    systemPrompt: `You write for ${BRAND_NAME}, an editorial product about the AI industry.

Be concise, factual, analytical, and grounded. No hype. State what happened first, then why it matters. Separate facts from interpretation. Flag uncertainty when source detail is thin. Return lowercase kebab-case tags. Keep categories inside the supported set.

Return only valid JSON with these keys:
- summary
- shortSummary
- whyItMatters
- categories
- tags
- impactDirection
- importanceScore`,
    prompt: `Provider: ${provider}
Model: ${model}
Headline: ${candidate.headline}
Companies: ${companyNames.join(", ") || "Unknown"}
Existing categories: ${candidate.categorySlugs.join(", ") || "none"}
Existing tags: ${candidate.tagSlugs.join(", ") || "none"}
Current impact direction: ${candidate.impactDirection}
Current importance score: ${candidate.importanceScore}
Confidence: ${candidate.confidenceScore}/10
Source: ${candidate.sourceName}
Source URL: ${candidate.sourceUrl}
Raw text: ${candidate.cleanedText ?? candidate.rawText ?? candidate.headline}

Requirements:
- summary must be 2 to 3 sentences.
- shortSummary must be a single sentence no longer than 120 characters.
- whyItMatters must be 1 to 2 sentences about industry significance.
- categories must be an array of supported slugs only.
- tags must be 2 to 5 lowercase kebab-case strings.
- impactDirection must be one of positive, negative, neutral.
- importanceScore must be an integer from 1 to 10.

Allowed categories:
- model-release
- product-launch
- funding
- partnership
- research
- benchmark
- policy-regulation
- infrastructure
- leadership
- controversy`,
    temperature: 0.2,
    maxOutputTokens: 700,
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

  if (!options?.forceResummarize && options?.existingSummary?.summary && options.existingSummary.shortSummary && options.existingSummary.whyItMatters) {
    runCache.set(cacheKey, fallback);
    return fallback;
  }

  if (!isLlmConfigured() || llmCallsThisRun >= MAX_LLM_CALLS_PER_RUN) {
    runCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    llmCallsThisRun += 1;
    const result = sanitizeSummaryFields(await summarizeWithLLM(candidate), fallback);
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
