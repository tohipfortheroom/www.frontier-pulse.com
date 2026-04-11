import { describe, expect, it } from "vitest";

import type { NewsItem } from "@/lib/seed/data";
import { buildNewsLaunchCards, selectTodayInAiStories } from "@/lib/homepage-surface";

function makeStory(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    slug: overrides.slug ?? "story",
    headline: overrides.headline ?? "Story headline",
    sourceName: overrides.sourceName ?? "Example Source",
    sourceUrl: overrides.sourceUrl ?? "https://example.com/story",
    publishedAt: overrides.publishedAt ?? "2026-04-10T12:00:00.000Z",
    summary: overrides.summary ?? "A complete summary sentence.",
    shortSummary: overrides.shortSummary ?? "A short summary sentence.",
    whyItMatters: overrides.whyItMatters ?? "A specific reason this matters.",
    importanceScore: overrides.importanceScore ?? 7,
    importanceLevel: overrides.importanceLevel ?? "Notable",
    confidenceScore: overrides.confidenceScore ?? 8,
    confidenceLevel: overrides.confidenceLevel ?? "High",
    impactDirection: overrides.impactDirection ?? "positive",
    companySlugs: overrides.companySlugs ?? ["openai"],
    categorySlugs: overrides.categorySlugs ?? ["product-launch"],
    tagSlugs: overrides.tagSlugs ?? ["launch"],
    breaking: overrides.breaking ?? false,
    summarizerModel: overrides.summarizerModel,
  };
}

describe("selectTodayInAiStories", () => {
  it("prefers the last 24 hours and sorts by importance then publish time", () => {
    const stories = [
      makeStory({ slug: "older", importanceScore: 10, publishedAt: "2026-04-08T20:00:00.000Z" }),
      makeStory({ slug: "recent-low", importanceScore: 6, publishedAt: "2026-04-10T10:00:00.000Z" }),
      makeStory({ slug: "recent-high", importanceScore: 9, publishedAt: "2026-04-10T09:00:00.000Z" }),
      makeStory({ slug: "recent-high-later", importanceScore: 9, publishedAt: "2026-04-10T11:00:00.000Z" }),
    ];

    const selected = selectTodayInAiStories(stories, new Date("2026-04-10T12:00:00.000Z"));

    expect(selected.map((story) => story.slug)).toEqual(["recent-high-later", "recent-high", "recent-low"]);
  });

  it("falls back to the newest day with stories when nothing landed in the last 24 hours", () => {
    const stories = [
      makeStory({ slug: "april-8", publishedAt: "2026-04-08T12:00:00.000Z", importanceScore: 7 }),
      makeStory({ slug: "april-7", publishedAt: "2026-04-07T12:00:00.000Z", importanceScore: 10 }),
    ];

    const selected = selectTodayInAiStories(stories, new Date("2026-04-10T12:00:00.000Z"));

    expect(selected.map((story) => story.slug)).toEqual(["april-8"]);
  });
});

describe("buildNewsLaunchCards", () => {
  it("builds launch cards from recent launch stories", () => {
    const cards = buildNewsLaunchCards([
      makeStory({
        slug: "model-launch",
        headline: "OpenAI launches GPT-6 preview",
        categorySlugs: ["model-release"],
        publishedAt: "2026-04-10T10:00:00.000Z",
      }),
      makeStory({
        slug: "product-launch",
        headline: "Anthropic rolls out a new API console",
        companySlugs: ["anthropic"],
        categorySlugs: ["product-launch"],
        publishedAt: "2026-04-10T09:00:00.000Z",
      }),
    ]);

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      slug: "model-launch",
      type: "MODEL",
      companySlug: "openai",
    });
    expect(cards[1]).toMatchObject({
      slug: "product-launch",
      type: "API",
      companySlug: "anthropic",
    });
  });
});
