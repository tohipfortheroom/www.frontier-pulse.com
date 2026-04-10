import { describe, expect, it } from "vitest";

import type { CompanyCardRecord } from "@/lib/db/types";
import type { CompanyProfile, NewsItem } from "@/lib/seed/data";
import { buildSectionFreshness, getCanonicalLeaderboardRecords, getContentDateKey, getLeaderboardRangeLabel, resolveDigestLeadStory } from "@/lib/surface-data";

function createCompany(slug: string, name: string): CompanyProfile {
  return {
    slug,
    name,
    shortName: name,
    color: "#111111",
    description: `${name} description.`,
    overview: `${name} overview.`,
    strengths: [],
    weaknesses: [],
    whyItMatters: `${name} matters.`,
    websiteUrl: `https://${slug}.example.com`,
    tags: [],
    products: [],
    partnerships: [],
    milestones: [],
    sparkline: [1, 2, 3],
  };
}

function createStory(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    slug: "story",
    headline: "Headline",
    sourceName: "Source",
    sourceUrl: "https://example.com",
    publishedAt: "2026-04-10T01:00:00.000Z",
    summary: "Summary.",
    shortSummary: "Summary.",
    whyItMatters: "It matters.",
    importanceScore: 8,
    importanceLevel: "Critical",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["openai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["model"],
    ...overrides,
  };
}

describe("surface-data helpers", () => {
  it("marks a section stale when the newest content is from a prior day", () => {
    expect(
      buildSectionFreshness({
        cacheKey: "home:today-in-ai",
        generatedAt: "2026-04-10T12:00:00.000Z",
        newestContentAt: "2026-04-03T16:00:00.000Z",
        contentCount: 5,
        expectedDateKey: getContentDateKey("2026-04-10T12:00:00.000Z"),
        now: "2026-04-10T12:00:00.000Z",
      }),
    ).toMatchObject({
      stale: true,
      status: "stale",
      newestContentDateKey: "2026-04-03",
    });
  });

  it("keeps fresh sections marked fresh when the newest content matches the current date", () => {
    expect(
      buildSectionFreshness({
        cacheKey: "home:breaking-moves",
        generatedAt: "2026-04-10T12:00:00.000Z",
        newestContentAt: "2026-04-10T09:22:06.000Z",
        contentCount: 3,
        expectedDateKey: getContentDateKey("2026-04-10T12:00:00.000Z"),
        now: "2026-04-10T12:00:00.000Z",
      }),
    ).toMatchObject({
      stale: false,
      status: "fresh",
      newestContentDateKey: "2026-04-10",
    });
  });

  it("uses one canonical ranking order across surfaces", () => {
    const records: CompanyCardRecord[] = [
      {
        company: createCompany("anthropic", "Anthropic"),
        activityCount: 12,
        momentum: { companySlug: "anthropic", rank: 2, score: 11, scoreChange24h: 2, scoreChange7d: 3, trend: "↑", keyDriver: "Anthropic moved.", sparkline: [1, 2], driverNewsSlugs: [] },
      },
      {
        company: createCompany("openai", "OpenAI"),
        activityCount: 15,
        momentum: { companySlug: "openai", rank: 1, score: 14, scoreChange24h: 4, scoreChange7d: 8, trend: "↑↑", keyDriver: "OpenAI moved.", sparkline: [1, 3], driverNewsSlugs: [] },
      },
      {
        company: createCompany("google-deepmind", "Google DeepMind"),
        activityCount: 11,
        momentum: { companySlug: "google-deepmind", rank: 3, score: 10, scoreChange24h: 1, scoreChange7d: 2, trend: "↑", keyDriver: "Google moved.", sparkline: [1, 1], driverNewsSlugs: [] },
      },
    ];

    expect(getCanonicalLeaderboardRecords(records).map((record) => record.company.slug)).toEqual([
      "openai",
      "anthropic",
      "google-deepmind",
    ]);
  });

  it("derives the visible ranking label from the actual row count", () => {
    expect(getLeaderboardRangeLabel(7)).toBe("Full Rankings · 4–10");
  });

  it("keeps the digest lead story and top-story list anchored to one record", () => {
    const metaStory = createStory({
      slug: "meta-story",
      headline: "Meta headline",
      summary: "Meta summary.",
      shortSummary: "Meta summary.",
      whyItMatters: "Meta matters.",
      companySlugs: ["meta-ai"],
      categorySlugs: ["product-launch"],
      tagSlugs: ["muse-spark"],
    });
    const anthropicStory = createStory({
      slug: "anthropic-story",
      headline: "Anthropic headline",
      summary: "Anthropic summary.",
      shortSummary: "Anthropic summary.",
      whyItMatters: "Anthropic matters.",
      companySlugs: ["anthropic"],
      tagSlugs: ["mythos"],
    });

    const resolved = resolveDigestLeadStory([anthropicStory, metaStory], metaStory);

    expect(resolved.leadStory?.slug).toBe("meta-story");
    expect(resolved.orderedStories.map((story) => story.slug)).toEqual(["meta-story", "anthropic-story"]);
  });
});
