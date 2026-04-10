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

import { LeaderboardTable } from "@/components/leaderboard-table";

describe("LeaderboardTable preview mode", () => {
  it("renders card-only preview rows without the legacy table", () => {
    const html = renderToStaticMarkup(
      <LeaderboardTable
        mode="preview"
        rows={[
          {
            companySlug: "openai",
            rank: 1,
            score: 82.4,
            scoreChange24h: 1.2,
            scoreChange7d: 4.8,
            trend: "↑↑",
            keyDriver: "Additional data center capacity reinforces OpenAI's ability to scale frontier demand.",
            sparkline: [70, 72, 74, 76, 78, 80, 82],
            driverNewsSlugs: ["openai-capacity"],
          },
        ]}
        footerHref="/leaderboard"
        footerLabel="Full leaderboard →"
      />,
    );

    expect(html).not.toContain("<table");
    expect(html).toContain("OpenAI");
    expect(html).toContain("Full details");
    expect(html).toContain("Momentum");
    expect((html.match(/Additional data center capacity reinforces/g) ?? []).length).toBe(1);
  });
});
