import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/db/browser-client", () => ({
  getSupabaseBrowserClient: () => null,
}));

import { LeaderboardCommandCenter } from "@/components/leaderboard-command-center";

describe("LeaderboardCommandCenter", () => {
  it("renders a non-zero comparison selection on first paint", () => {
    const html = renderToStaticMarkup(
      <LeaderboardCommandCenter
        records={[
          {
            company: {
              slug: "openai",
              name: "OpenAI",
              shortName: "OpenAI",
              color: "#00ffcc",
              description: "OpenAI description.",
              overview: "OpenAI overview.",
              strengths: [],
              weaknesses: [],
              whyItMatters: "OpenAI matters.",
              websiteUrl: "https://openai.com",
              tags: [],
              products: [],
              partnerships: [],
              milestones: [],
              sparkline: [1, 2, 3],
            },
            activityCount: 8,
            momentum: {
              companySlug: "openai",
              rank: 1,
              score: 82,
              scoreChange24h: 1.2,
              scoreChange7d: 4.4,
              trend: "↑↑",
              keyDriver: "OpenAI expanded enterprise controls.",
              sparkline: [70, 74, 78, 82],
              driverNewsSlugs: ["openai-controls"],
              driverSourceTierLabel: "Official",
              driverConfidenceLabel: "High",
              driverConfidenceScore: 9,
            },
          },
          {
            company: {
              slug: "anthropic",
              name: "Anthropic",
              shortName: "Anthropic",
              color: "#ffaa00",
              description: "Anthropic description.",
              overview: "Anthropic overview.",
              strengths: [],
              weaknesses: [],
              whyItMatters: "Anthropic matters.",
              websiteUrl: "https://anthropic.com",
              tags: [],
              products: [],
              partnerships: [],
              milestones: [],
              sparkline: [1, 2, 3],
            },
            activityCount: 6,
            momentum: {
              companySlug: "anthropic",
              rank: 2,
              score: 79,
              scoreChange24h: 0.8,
              scoreChange7d: 3.2,
              trend: "↑",
              keyDriver: "Anthropic launched new controls.",
              sparkline: [68, 72, 75, 79],
              driverNewsSlugs: ["anthropic-controls"],
              driverSourceTierLabel: "Reputable media",
              driverConfidenceLabel: "High",
              driverConfidenceScore: 8,
            },
          },
        ]}
        recentEvents={[]}
        refreshState={{
          cacheKey: "leaderboard:refresh-state",
          fetchedAt: "2026-04-11T12:00:00.000Z",
          lastUpdatedAt: "2026-04-11T12:00:00.000Z",
          isRunning: false,
          status: "fresh",
          reason: "Leaderboard snapshot is current.",
        }}
      />,
    );

    expect(html).toContain("2 of 2 leaders shown");
    expect(html).not.toContain("0 of 2 leaders shown");
    expect(html).toContain("Official · High confidence");
  });
});
