import { describe, expect, it } from "vitest";

import { buildSiteStatsSnapshot } from "@/lib/site-stats";

describe("buildSiteStatsSnapshot", () => {
  it("keeps tracked, ranked, and leaderboard surface counts distinct", () => {
    expect(
      buildSiteStatsSnapshot({
        totalStories: 42,
        trackedCompanyCount: 15,
        rankedCompanyCount: 10,
        totalLaunches: 6,
        totalEvents: 24,
        lastUpdatedAt: "2026-04-10T12:00:00.000Z",
        seedMode: false,
      }),
    ).toMatchObject({
      trackedCompanyCount: 15,
      rankedCompanyCount: 10,
      leaderboardSurfaceCount: 10,
      totalEvents: 24,
      heatmapEventTotal: 24,
    });
  });
});
