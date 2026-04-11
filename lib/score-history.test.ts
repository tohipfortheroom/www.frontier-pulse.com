import { describe, expect, it } from "vitest";

import {
  buildDailyHistoryEntriesFromMomentumRows,
  buildHistoryChartSeries,
  buildSparklineFromHistory,
  calculateScoreChangeFromHistory,
  calculateTrendPercent,
  formatTrendPercent,
  getHistoryWindowDateKeys,
} from "@/lib/score-history";

describe("score history utilities", () => {
  it("keeps only the latest snapshot per company per day when deriving daily history", () => {
    const rows = buildDailyHistoryEntriesFromMomentumRows(
      [{ id: "company-1", slug: "openai" }],
      [
        { company_id: "company-1", score: 10.1, calculated_at: "2026-04-03T08:00:00.000Z" },
        { company_id: "company-1", score: 11.4, calculated_at: "2026-04-03T17:00:00.000Z" },
        { company_id: "company-1", score: 12.6, calculated_at: "2026-04-04T12:00:00.000Z" },
      ],
    );

    expect(rows).toEqual([
      {
        companySlug: "openai",
        dateKey: "2026-04-03",
        score: 11.4,
        calculatedAt: "2026-04-03T17:00:00.000Z",
      },
      {
        companySlug: "openai",
        dateKey: "2026-04-04",
        score: 12.6,
        calculatedAt: "2026-04-04T12:00:00.000Z",
      },
    ]);
  });

  it("step-fills missing days in the chart series instead of interpolating", () => {
    const chart = buildHistoryChartSeries(
      [
        {
          companySlug: "openai",
          history: [
            { date: "2026-04-03", score: 10 },
            { date: "2026-04-05", score: 15 },
          ],
        },
      ],
      "all",
    );

    expect(chart.dateKeys).toEqual(["2026-04-03", "2026-04-04", "2026-04-05"]);
    expect(chart.series.map((row) => row.openai)).toEqual([10, 10, 15]);
  });

  it("treats a single logged day as a cold start and reports the actual range", () => {
    const chart = buildHistoryChartSeries(
      [{ companySlug: "openai", history: [{ date: "2026-04-03", score: 18.4 }] }],
      30,
    );

    expect(chart.isColdStart).toBe(true);
    expect(chart.rangeLabel).toBe("Apr 3, 2026");
    expect(chart.series).toHaveLength(1);
    expect(chart.series[0].openai).toBe(18.4);
  });

  it("uses the oldest available score as the seven-day baseline when exact history is missing", () => {
    const history = [
      { date: "2026-04-08", score: 10 },
      { date: "2026-04-10", score: 12 },
    ];

    expect(getHistoryWindowDateKeys(history.map((point) => point.date), 7)).toEqual([
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
    ]);
    expect(calculateScoreChangeFromHistory(history, 7)).toBe(2);

    const trend = calculateTrendPercent(history, 7);
    expect(trend.status).toBe("percent");
    expect(trend.value).toBe(20);
    expect(formatTrendPercent(trend)).toBe("+20.0%");
    expect(buildSparklineFromHistory(history, 7)).toEqual([10, 10, 12]);
  });

  it("returns NEW for zero baselines and N/A when there is not enough history", () => {
    const zeroBaseline = calculateTrendPercent(
      [
        { date: "2026-04-03", score: 0 },
        { date: "2026-04-10", score: 5 },
      ],
      7,
    );
    const insufficient = calculateTrendPercent([{ date: "2026-04-10", score: 5 }], 7);

    expect(zeroBaseline.status).toBe("new");
    expect(formatTrendPercent(zeroBaseline)).toBe("NEW");
    expect(insufficient.status).toBe("na");
    expect(formatTrendPercent(insufficient)).toBe("N/A");
  });
});
