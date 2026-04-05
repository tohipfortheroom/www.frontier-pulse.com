import { describe, expect, it } from "vitest";

import { buildRssFeed } from "@/lib/rss";
import type { NewsItem } from "@/lib/seed/data";

const baseItem: NewsItem = {
  slug: "entity-check",
  headline: "Copilot&#8217;s policy update",
  sourceName: "Example Source",
  sourceUrl: "https://example.com/article",
  publishedAt: "2026-04-05T18:30:00Z",
  summary: "Summary with &amp;, &#8216;entities&#8217;, and &lt; 24 hours.",
  shortSummary: "Short summary",
  whyItMatters: "Why it matters",
  importanceScore: 8,
  importanceLevel: "Notable",
  confidenceScore: 0.8,
  confidenceLevel: "High",
  impactDirection: "positive",
  companySlugs: ["openai"],
  categorySlugs: ["model-releases"],
  tagSlugs: [],
};

describe("buildRssFeed", () => {
  it("decodes html entities before xml escaping", () => {
    const xml = buildRssFeed({
      title: "Test Feed",
      description: "A test feed",
      path: "/feed.xml",
      items: [baseItem],
      siteUrl: "https://example.com",
    });

    expect(xml).toContain("<title>Copilot’s policy update</title>");
    expect(xml).toContain("Summary with &amp;, ‘entities’, and &amp;lt; 24 hours.");
    expect(xml).not.toContain("&amp;#8217;");
    expect(xml).not.toContain("&amp;#8216;");
  });
});
