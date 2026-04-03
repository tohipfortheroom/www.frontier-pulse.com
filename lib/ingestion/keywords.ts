import type { SourceDefinition } from "./types.ts";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeKeywordText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchesKeyword(text: string, keyword: string) {
  const normalizedText = normalizeKeywordText(text);
  const normalizedKeyword = normalizeKeywordText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  if (/^[a-z0-9]+$/i.test(normalizedKeyword)) {
    return new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i").test(normalizedText);
  }

  return normalizedText.includes(normalizedKeyword);
}

export function matchesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => matchesKeyword(text, keyword));
}

export const companyKeywordMap: Record<string, string[]> = {
  openai: ["openai", "chatgpt", "gpt-5", "gpt 5", "sora", "o3 model", "o3-pro", "o3 pro", "o4-mini", "o4 mini"],
  anthropic: ["anthropic", "claude", "claude 4", "claude 4.6", "claude sonnet", "claude opus", "claude code"],
  "google-deepmind": ["google deepmind", "deepmind", "gemini", "gemini 2.5", "gemini 3", "gemini 3.0", "alphafold"],
  "meta-ai": ["meta ai", "llama", "llama 4", "llama 5", "executorch", "mtia"],
  xai: ["xai", "x.ai", "grok", "grok 5", "colossus"],
  "microsoft-ai": ["microsoft ai", "copilot", "azure ai", "phi-4", "phi 4", "phi-5", "phi 5"],
  "amazon-aws-ai": ["aws ai", "amazon bedrock", "bedrock", "trainium", "nova", "amazon nova"],
  mistral: ["mistral", "le chat", "codestral", "ministral", "mistral large"],
  deepseek: ["deepseek", "r2 reasoning", "deepseek r2", "deepseek coder"],
  nvidia: ["nvidia", "blackwell", "dgx", "nim", "rubin", "nvlink"],
};

export const tagKeywordMap: Record<string, string[]> = {
  "gpt-5": ["gpt-5", "gpt 5"],
  o3: ["o3 model", "o3-pro", "o3 pro"],
  "o4-mini": ["o4-mini", "o4 mini"],
  "claude-4": ["claude 4", "claude sonnet 4", "claude opus 4"],
  "claude-4-6": ["claude 4.6", "claude 4 6", "claude sonnet 4.6", "claude opus 4.6"],
  "gemini-2-5": ["gemini 2.5", "gemini 2 5"],
  "gemini-3": ["gemini 3", "gemini 3.0"],
  "llama-4": ["llama 4", "llama4"],
  "grok-5": ["grok 5", "grok5"],
  "open-weight": ["open-weight", "open weight", "open-source", "open source"],
  enterprise: ["enterprise", "workplace", "workspace"],
  reasoning: ["reasoning", "reasoning model", "agentic", "multi-step", "test-time compute"],
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
  "code-generation": ["code generation", "coding model", "developer model", "software engineering"],
  search: ["search", "web search", "deep research", "retrieval"],
  "image-generation": ["image generation", "text-to-image", "image model", "diffusion"],
  voice: ["voice", "speech", "audio conversation", "text to speech", "speech to text"],
  "on-device": ["on-device", "on device", "edge ai", "device inference", "mobile inference", "local model"],
};

export const trackedAiKeywords = Array.from(
  new Set([
    ...Object.values(companyKeywordMap).flat(),
    ...Object.values(tagKeywordMap).flat(),
    "frontier model",
    "foundation model",
    "llm",
    "generative ai",
    "artificial intelligence",
    "inference",
    "fine-tuning",
  ]),
);

export function passesSourceFilters(source: SourceDefinition, text: string, url?: string) {
  const urlAllowed =
    !source.itemUrlPrefixes || source.itemUrlPrefixes.length === 0 || source.itemUrlPrefixes.some((prefix) => (url ?? "").startsWith(prefix));

  if (!urlAllowed) {
    return false;
  }

  if (!source.includeKeywords || source.includeKeywords.length === 0) {
    return true;
  }

  return matchesAnyKeyword(text, source.includeKeywords);
}
