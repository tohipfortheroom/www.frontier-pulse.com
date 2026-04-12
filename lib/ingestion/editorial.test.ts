import { describe, expect, it } from "vitest";

import { applyEditorialRules } from "./editorial.ts";
import { normalizeIngestedItem } from "./normalizer.ts";
import { scoreCandidate } from "./scorer.ts";
import type { RawIngestedItem } from "./types.ts";

function buildRawItem(overrides: Partial<RawIngestedItem>): RawIngestedItem {
  return {
    sourceId: "techcrunch-ai",
    sourceName: "TechCrunch AI",
    sourceUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    sourceReliability: 0.86,
    sourcePriority: 1,
    url: "https://example.com/story",
    title: "Example story",
    excerpt: "",
    rawText: "",
    publishedAt: "2026-04-07T12:00:00Z",
    fetchedAt: "2026-04-07T12:05:00Z",
    ...overrides,
  };
}

function prepare(rawItem: RawIngestedItem) {
  const normalized = normalizeIngestedItem(rawItem);

  if (!normalized) {
    throw new Error("Expected normalized candidate");
  }

  const editorial = applyEditorialRules(normalized, rawItem);

  return {
    editorial,
    scored: {
      ...editorial.candidate,
      ...scoreCandidate(editorial.candidate, rawItem, editorial),
    },
  };
}

describe("applyEditorialRules", () => {
  it("suppresses Show HN client libraries instead of treating them like launches", () => {
    const rawItem = buildRawItem({
      sourceId: "hacker-news-ai",
      sourceName: "Hacker News AI",
      sourceReliability: 0.7,
      sourcePriority: 2,
      url: "https://github.com/example/ollama-rs",
      title: "Show HN: Rust client library for Ollama",
      excerpt: "A side project for working with local models from Rust.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.publishable).toBe(false);
    expect(editorial.importanceCap).toBeLessThanOrEqual(2);
  });

  it("suppresses founder commentary without a real organizational move", () => {
    const rawItem = buildRawItem({
      title: "Sam Altman comments on the idea of a four-day work week",
      excerpt: "In an interview, Altman said the idea was interesting but did not announce any company change.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.publishable).toBe(false);
  });

  it("suppresses leadership opinion headlines that are not product activity", () => {
    const rawItem = buildRawItem({
      title: "Sam Altman tells companies to try a four-day working week",
      excerpt: "The interview contains advice and opinion, not a launch, hiring move, or policy action by OpenAI.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.publishable).toBe(false);
  });

  it("keeps research papers in research with a capped score when there is no rollout", () => {
    const rawItem = buildRawItem({
      sourceId: "arxiv-cs-ai",
      sourceName: "arXiv cs.AI",
      sourceReliability: 0.78,
      sourcePriority: 4,
      url: "https://arxiv.org/abs/2604.12345",
      title: "A new reasoning benchmark for multimodal agents",
      excerpt: "We present a research paper and benchmark for evaluating multimodal agents.",
    });

    const { editorial, scored } = prepare(rawItem);

    expect(editorial.publishable).toBe(true);
    expect(editorial.candidate.categorySlugs).toContain("research");
    expect(editorial.candidate.categorySlugs).not.toContain("model-release");
    expect(scored.importanceScore).toBeLessThanOrEqual(4);
  });

  it("does not let research headlines fall through to product launch", () => {
    const rawItem = buildRawItem({
      title: "Frequent ChatGPT users are accurate detectors of AI-generated text",
      excerpt: "The study presents research findings about detection performance, with no launch or rollout.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.candidate.categorySlugs).toContain("research");
    expect(editorial.candidate.categorySlugs).not.toContain("product-launch");
  });

  it("suppresses community showcase partnership false positives", () => {
    const rawItem = buildRawItem({
      sourceId: "hacker-news-ai",
      sourceName: "Hacker News AI",
      sourceReliability: 0.7,
      sourcePriority: 2,
      url: "https://github.com/example/frontend-visualqa",
      title: "Show HN: Frontend-VisualQA",
      excerpt: "A visual QA tool that works with Claude, GPT, and other APIs for frontend testing.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.publishable).toBe(false);
    expect(editorial.candidate.categorySlugs).not.toContain("partnership");
  });

  it("allows official launches to stay publishable and digest-eligible", () => {
    const rawItem = buildRawItem({
      sourceId: "openai-news",
      sourceName: "OpenAI News",
      sourceReliability: 0.98,
      sourcePriority: 1,
      companyHint: "openai",
      url: "https://openai.com/news/agents-api-enterprise-rollout",
      title: "OpenAI rolls out Agents API to enterprise customers",
      excerpt: "The launch adds pricing, enterprise controls, and immediate API availability for customers.",
    });

    const { editorial, scored } = prepare(rawItem);

    expect(editorial.publishable).toBe(true);
    expect(editorial.digestEligible).toBe(true);
    expect(editorial.candidate.categorySlugs).toContain("product-launch");
    expect(scored.importanceScore).toBeGreaterThanOrEqual(7);
  });

  it("keeps acquisitions distinct from partnerships", () => {
    const rawItem = buildRawItem({
      title: "Microsoft acquires Windsurf to deepen enterprise coding automation",
      excerpt: "Microsoft is acquiring Windsurf in a move that adds ownership of the coding assistant stack.",
    });

    const { editorial, scored } = prepare(rawItem);

    expect(editorial.candidate.categorySlugs).toContain("acquisition");
    expect(editorial.candidate.categorySlugs).not.toContain("partnership");
    expect(scored.importanceScore).toBeGreaterThanOrEqual(8);
  });

  it("does not mark generic product shipping language as infrastructure", () => {
    const rawItem = buildRawItem({
      title: "Anthropic ships new Claude admin controls for enterprise teams",
      excerpt: "The update adds policy controls and audit logs, but does not describe any data center or compute expansion.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.candidate.categorySlugs).not.toContain("infrastructure");
  });

  it("allows infrastructure only when compute evidence is explicit", () => {
    const rawItem = buildRawItem({
      title: "OpenAI expands Stargate training cluster capacity with new GPU buildout",
      excerpt: "The company said the new buildout adds more GPU capacity and server racks for training and inference workloads.",
    });

    const { editorial } = prepare(rawItem);

    expect(editorial.candidate.categorySlugs).toContain("infrastructure");
  });
});
