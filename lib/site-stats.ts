import type { SiteStatsSnapshot } from "@/lib/db/types";

export function buildSiteStatsSnapshot(input: {
  totalStories: number;
  trackedCompanyCount: number;
  rankedCompanyCount: number;
  totalLaunches: number;
  totalEvents: number;
  lastUpdatedAt: string;
  seedMode: boolean;
}): SiteStatsSnapshot {
  return {
    totalStories: input.totalStories,
    trackedCompanyCount: input.trackedCompanyCount,
    rankedCompanyCount: input.rankedCompanyCount,
    leaderboardSurfaceCount: Math.min(input.rankedCompanyCount, 10),
    totalLaunches: input.totalLaunches,
    totalEvents: input.totalEvents,
    heatmapEventTotal: input.totalEvents,
    lastUpdatedAt: input.lastUpdatedAt,
    seedMode: input.seedMode,
  };
}
