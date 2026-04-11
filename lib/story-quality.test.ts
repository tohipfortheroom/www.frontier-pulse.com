import { describe, expect, it } from "vitest";

import {
  buildStoryDriverCopy,
  filterDigestWatchNext,
  isDigestSurfaceStory,
  isLaunchSurfaceStory,
  isOffTopicStory,
  isPrestigeSurfaceStory,
  isSharedCompareStory,
} from "@/lib/story-quality";

describe("story quality helpers", () => {
  const baseStory = {
    slug: "test-story",
    headline: "Anthropic expands Claude deployment controls on Amazon Bedrock",
    sourceName: "Anthropic News",
    sourceUrl: "https://www.anthropic.com/news/claude-bedrock-controls",
    publishedAt: "2026-04-11T12:00:00.000Z",
    summary: "Anthropic expanded Claude deployment controls for Bedrock customers in regulated environments.",
    shortSummary: "Anthropic expanded Claude deployment controls for Bedrock customers.",
    whyItMatters: "The update makes Claude easier to adopt in regulated enterprise settings where deployment controls can decide vendor choice.",
    importanceScore: 8,
    importanceLevel: "Critical" as const,
    confidenceScore: 8,
    confidenceLevel: "High" as const,
    impactDirection: "positive" as const,
    companySlugs: ["anthropic", "amazon-aws-ai"],
    categorySlugs: ["partnership", "product-launch"],
    tagSlugs: ["enterprise", "api"],
  };

  it("suppresses off-topic cultural commentary", () => {
    expect(
      isOffTopicStory({
        headline: "Your article about AI doesn’t need AI art",
        summary: "The piece argues that publications should stop using synthetic illustrations for AI stories.",
        shortSummary: "",
        whyItMatters: "",
      }),
    ).toBe(true);
  });

  it("keeps high-signal company stories on prestige surfaces", () => {
    expect(isPrestigeSurfaceStory(baseStory)).toBe(true);
    expect(isDigestSurfaceStory(baseStory)).toBe(true);
    expect(
      isLaunchSurfaceStory({
        ...baseStory,
        headline: "Anthropic launches Claude Code API for enterprise developers",
        summary: "Anthropic launched a Claude Code API for enterprise developers with new deployment controls.",
        shortSummary: "Anthropic launched a Claude Code API for enterprise developers.",
      }),
    ).toBe(true);
  });

  it("rejects weak shared compare stories even when multiple companies are attached", () => {
    expect(
      isSharedCompareStory(
        {
          ...baseStory,
          headline: "Researchers from MIT, NVIDIA, and Zhejiang University propose TriAttention",
          summary: "The paper introduces a new attention mechanism for long-context reasoning.",
          shortSummary: "The paper introduces a new attention mechanism.",
          whyItMatters: "",
          sourceName: "Hacker News AI",
          companySlugs: ["nvidia", "meta-ai", "mistral"],
          categorySlugs: ["research", "benchmark"],
          importanceScore: 4,
          confidenceScore: 5,
        },
        ["nvidia", "meta-ai"],
      ),
    ).toBe(false);
  });

  it("prefers specific analytical copy for key drivers", () => {
    expect(buildStoryDriverCopy(baseStory, "anthropic")).toBe(
      "The update makes Claude easier to adopt in regulated enterprise settings where deployment controls can decide vendor choice.",
    );
  });

  it("drops generic watch-next bullets", () => {
    expect(
      filterDigestWatchNext([
        "Watch for broader availability, pricing, and independent validation after anthropic.",
        "Track whether Anthropic turns this rollout into broader enterprise adoption over the next week.",
      ]),
    ).toEqual(["Track whether Anthropic turns this rollout into broader enterprise adoption over the next week."]);
  });
});
