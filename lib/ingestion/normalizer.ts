import { companiesBySlug } from "../seed/data.ts";

import type { NormalizedCandidate, RawIngestedItem } from "./types.ts";

const companyKeywordMap: Record<string, string[]> = {
  openai: ["openai", "chatgpt", "gpt-5", "gpt 5", "sora"],
  anthropic: ["anthropic", "claude"],
  "google-deepmind": ["google deepmind", "deepmind", "gemini"],
  "meta-ai": ["meta ai", "llama", "meta"],
  xai: ["xai", "grok", "colossus"],
  "microsoft-ai": ["microsoft ai", "copilot", "azure ai", "phi-4", "phi 4"],
  "amazon-aws-ai": ["aws ai", "amazon bedrock", "bedrock", "trainium", "nova"],
  mistral: ["mistral", "le chat", "codestral"],
  deepseek: ["deepseek", "r2 reasoning", "deepseek coder"],
  nvidia: ["nvidia", "blackwell", "dgx", "nim"],
};

const tagKeywordMap: Record<string, string[]> = {
  "gpt-5": ["gpt-5", "gpt 5"],
  "claude-4-6": ["claude 4.6", "claude 4 6"],
  "gemini-3": ["gemini 3", "gemini 3.0"],
  "open-weight": ["open-weight", "open weight", "open-source", "open source"],
  enterprise: ["enterprise", "workplace", "workspace"],
  reasoning: ["reasoning", "agentic", "multi-step"],
  safety: ["safety", "governance", "alignment", "red-team", "red team"],
  chips: ["chip", "chips", "gpu", "accelerator", "silicon"],
  "data-centers": ["data center", "datacenter", "cluster", "capacity"],
  agents: ["agent", "agents", "automation", "workflow"],
  "eu-ai-act": ["eu ai act", "regulation", "complaint", "policy"],
  multimodal: ["multimodal", "video", "vision", "audio"],
  api: ["api", "sdk", "endpoint"],
  video: ["video", "sora"],
  robotics: ["robotics", "robot", "embodied"],
  finance: ["bank", "finance", "financial"],
  copilot: ["copilot"],
  "training-clusters": ["cluster", "training", "compute"],
  pricing: ["pricing", "discount", "cost", "margin"],
  governance: ["governance", "compliance", "policy"],
  benchmarks: ["benchmark", "eval", "evaluation"],
};

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
  const normalized = text.toLowerCase();
  const matches = Object.entries(companyKeywordMap)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
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

  if (/(appoints|hires|steps down|advisory|chief|executive)/i.test(normalized)) {
    categories.add("leadership");
  }

  if (categories.size === 0) {
    categories.add("product-launch");
  }

  return [...categories];
}

function detectTags(text: string) {
  const normalized = text.toLowerCase();

  return Object.entries(tagKeywordMap)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([slug]) => slug);
}

function detectImpactDirection(text: string) {
  const normalized = text.toLowerCase();

  if (/(churn|pressure|complaint|setback|delay|risk|steps down|cuts|concern)/i.test(normalized)) {
    return "negative";
  }

  if (/(launch|release|ships|wins|agreement|expands|tops|opens|preview)/i.test(normalized)) {
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

  if (!item.title) {
    return null;
  }

  return {
    headline: item.title,
    slug: slugify(item.title),
    sourceName: item.sourceName,
    sourceUrl: item.url,
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
