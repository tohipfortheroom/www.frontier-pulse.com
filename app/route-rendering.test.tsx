import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCompaniesIndexData,
  mockGetNewsItemsData,
  mockGetLeaderboardRefreshState,
  mockGetSiteStatsData,
  mockGetSourceHealthSnapshot,
} = vi.hoisted(() => ({
  mockGetCompaniesIndexData: vi.fn(),
  mockGetNewsItemsData: vi.fn(),
  mockGetLeaderboardRefreshState: vi.fn(),
  mockGetSiteStatsData: vi.fn(),
  mockGetSourceHealthSnapshot: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  getCompaniesIndexData: mockGetCompaniesIndexData,
  getNewsItemsData: mockGetNewsItemsData,
  getLeaderboardRefreshState: mockGetLeaderboardRefreshState,
  getSiteStatsData: mockGetSiteStatsData,
}));

vi.mock("@/lib/ingestion/pipeline", () => ({
  sourceRegistry: [],
}));

vi.mock("@/lib/ingestion/source-health", () => ({
  getSourceHealthSnapshot: mockGetSourceHealthSnapshot,
}));

vi.mock("@/components/section-header", () => ({
  SectionHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/module-status-strip", () => ({
  ModuleStatusStrip: ({
    items,
    warning,
  }: {
    items: Array<{ label: string; value: string }>;
    warning?: string | null;
  }) => (
    <div>
      <div>{items.map((item) => `${item.label}:${item.value}`).join("|")}</div>
      {warning ? <div>{warning}</div> : null}
    </div>
  ),
}));

vi.mock("@/components/news-page-client", () => ({
  NewsPageClient: ({
    initialFilters,
  }: {
    initialFilters: {
      query: string;
      company: string;
      category: string;
      timeframe: string;
      importance: string;
      tag: string | null;
      day: string | null;
    };
  }) => <div>{JSON.stringify(initialFilters)}</div>,
}));

vi.mock("@/components/compare-page-client", () => ({
  ComparePageClient: ({
    initialSelectedSlugs = [],
  }: {
    initialSelectedSlugs?: string[];
  }) => <div>{initialSelectedSlugs.join(",")}</div>,
}));

import ComparePage from "@/app/compare/page";
import NewsPage from "@/app/news/page";

describe("route rendering regressions", () => {
  beforeEach(() => {
    mockGetCompaniesIndexData.mockReset();
    mockGetNewsItemsData.mockReset();
    mockGetLeaderboardRefreshState.mockReset();
    mockGetSiteStatsData.mockReset();
    mockGetSourceHealthSnapshot.mockReset();
  });

  it("renders the news page with honest stale messaging and static default filters", async () => {
    mockGetNewsItemsData.mockResolvedValue([
      {
        id: "story-1",
        publishedAt: "2026-04-10T08:00:00.000Z",
      },
    ]);
    mockGetCompaniesIndexData.mockResolvedValue([]);
    mockGetSourceHealthSnapshot.mockResolvedValue({
      latestPublishedAt: "2026-04-10T08:00:00.000Z",
      currentStatus: "STALE",
      staleData: true,
      sourceSummary: { total: 12 },
    });

    const html = renderToStaticMarkup(await NewsPage());

    expect(html).toContain("A clean, filterable stream of AI moves");
    expect(html).toContain("The live ingest is behind.");
    expect(html).toContain("&quot;query&quot;:&quot;&quot;");
    expect(html).toContain("&quot;company&quot;:&quot;all&quot;");
    expect(html).toContain("&quot;category&quot;:&quot;all&quot;");
    expect(html).toContain("&quot;timeframe&quot;:&quot;7d&quot;");
  });

  it("renders the compare page with truthful ranking freshness and a static shell", async () => {
    mockGetCompaniesIndexData.mockResolvedValue([
      { company: { slug: "openai" }, momentum: { score: 82 } },
      { company: { slug: "anthropic" }, momentum: { score: 79 } },
    ]);
    mockGetNewsItemsData.mockResolvedValue([
      {
        id: "story-1",
        publishedAt: "2026-04-10T09:00:00.000Z",
      },
    ]);
    mockGetLeaderboardRefreshState.mockResolvedValue({
      lastUpdatedAt: "2026-04-03T12:00:00.000Z",
      status: "stale",
      reason: "Leaderboard snapshot is behind the news feed.",
      isRunning: false,
    });
    mockGetSiteStatsData.mockResolvedValue({
      totalStories: 24,
      trackedCompanyCount: 15,
      rankedCompanyCount: 2,
      leaderboardSurfaceCount: 2,
      totalLaunches: 6,
      totalEvents: 12,
      heatmapEventTotal: 12,
      lastUpdatedAt: "2026-04-10T09:00:00.000Z",
      seedMode: false,
    });

    const html = renderToStaticMarkup(await ComparePage());

    expect(html).toContain("Stack the contenders side by side");
    expect(html).toContain("Leaderboard snapshot is behind the news feed.");
    expect(html).toContain("Tracked:15");
    expect(html).toContain("Ranked:2");
    expect(html).toContain("Surface:Top 2");
    expect(html).toContain("<div></div>");
  });
});
