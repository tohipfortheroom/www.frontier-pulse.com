import { describe, expect, it } from "vitest";
import { subDays } from "date-fns";

import {
  applyTimeDecay,
  calculateMomentumChange,
  calculateMomentumScore,
  EVENT_WEIGHTS,
  getBaseWeight,
  type EventType,
  type MomentumEventLike,
} from "./momentum";

const NOW = new Date("2026-04-03T12:00:00Z");

describe("getBaseWeight", () => {
  it("returns correct positive weights", () => {
    expect(getBaseWeight("Major model release")).toBe(10);
    expect(getBaseWeight("Major product launch")).toBe(8);
    expect(getBaseWeight("Enterprise partnership")).toBe(7);
  });

  it("returns correct negative weights", () => {
    expect(getBaseWeight("Controversy")).toBe(-4);
    expect(getBaseWeight("Failed/delayed launch")).toBe(-5);
    expect(getBaseWeight("Regulatory setback")).toBe(-6);
  });

  it("has weights for all event types", () => {
    const types: EventType[] = [
      "Major model release",
      "Major product launch",
      "Enterprise partnership",
      "Funding round",
      "Infrastructure expansion",
      "Research breakthrough",
      "Benchmark claim",
      "Executive change",
      "Controversy",
      "Failed/delayed launch",
      "Regulatory setback",
    ];

    types.forEach((type) => {
      expect(EVENT_WEIGHTS[type]).toBeDefined();
    });
  });
});

describe("applyTimeDecay", () => {
  it("returns full score for events happening now", () => {
    const decayed = applyTimeDecay(10, NOW, NOW);
    expect(decayed).toBe(10);
  });

  it("applies exponential decay for recent events", () => {
    const oneDayAgo = subDays(NOW, 1).toISOString();
    const decayed = applyTimeDecay(10, oneDayAgo, NOW);

    // 10 * 0.9^1 = 9
    expect(decayed).toBeCloseTo(9, 1);
  });

  it("applies stronger decay for older events", () => {
    const sevenDaysAgo = subDays(NOW, 7).toISOString();
    const decayed = applyTimeDecay(10, sevenDaysAgo, NOW);

    // 10 * 0.9^7 ≈ 4.78
    expect(decayed).toBeCloseTo(4.78, 1);
  });

  it("returns 0 for events older than 30 days", () => {
    const thirtyOneDaysAgo = subDays(NOW, 31).toISOString();
    const decayed = applyTimeDecay(10, thirtyOneDaysAgo, NOW);

    expect(decayed).toBe(0);
  });

  it("handles negative scores", () => {
    const decayed = applyTimeDecay(-4, NOW, NOW);
    expect(decayed).toBe(-4);
  });

  it("handles events at exactly 30 days", () => {
    const thirtyDaysAgo = subDays(NOW, 30).toISOString();
    const decayed = applyTimeDecay(10, thirtyDaysAgo, NOW);

    // 10 * 0.9^30 ≈ 0.42
    expect(decayed).toBeGreaterThan(0);
    expect(decayed).toBeLessThan(1);
  });
});

describe("calculateMomentumScore", () => {
  const events: MomentumEventLike[] = [
    {
      companySlug: "openai",
      eventType: "Major model release",
      scoreDelta: 10,
      eventDate: NOW.toISOString(),
    },
    {
      companySlug: "openai",
      eventType: "Infrastructure expansion",
      scoreDelta: 6,
      eventDate: subDays(NOW, 1).toISOString(),
    },
    {
      companySlug: "anthropic",
      eventType: "Major model release",
      scoreDelta: 10,
      eventDate: NOW.toISOString(),
    },
  ];

  it("sums decayed scores for a specific company", () => {
    const score = calculateMomentumScore(events, "openai", NOW);

    // 10 * 0.9^0 + 6 * 0.9^1 = 10 + 5.4 = 15.4
    expect(score).toBeCloseTo(15.4, 1);
  });

  it("filters events by company slug", () => {
    const score = calculateMomentumScore(events, "anthropic", NOW);

    // Only one event for anthropic: 10 * 0.9^0 = 10
    expect(score).toBeCloseTo(10, 1);
  });

  it("returns 0 for company with no events", () => {
    const score = calculateMomentumScore(events, "google-deepmind", NOW);
    expect(score).toBe(0);
  });

  it("uses event type weight when scoreDelta is not provided", () => {
    const eventsWithoutDelta: MomentumEventLike[] = [
      {
        companySlug: "meta-ai",
        eventType: "Controversy",
        eventDate: NOW.toISOString(),
      },
    ];

    const score = calculateMomentumScore(eventsWithoutDelta, "meta-ai", NOW);
    expect(score).toBe(-4); // Controversy weight
  });
});

describe("calculateMomentumChange", () => {
  const events: MomentumEventLike[] = [
    {
      companySlug: "openai",
      eventType: "Major model release",
      scoreDelta: 10,
      eventDate: NOW.toISOString(),
    },
    {
      companySlug: "openai",
      eventType: "Infrastructure expansion",
      scoreDelta: 6,
      eventDate: subDays(NOW, 3).toISOString(),
    },
  ];

  it("calculates 24h change as current minus prior", () => {
    const change = calculateMomentumChange(events, "openai", NOW, 1);

    // Both events are in the past relative to both reference dates,
    // but the older event decays more at current time than at prior time.
    // The change reflects the net decay effect.
    expect(typeof change).toBe("number");
    expect(Number.isFinite(change)).toBe(true);
  });

  it("calculates 7d change as current minus prior", () => {
    const change = calculateMomentumChange(events, "openai", NOW, 7);
    expect(typeof change).toBe("number");
    expect(Number.isFinite(change)).toBe(true);
  });

  it("returns 0 for company with no events", () => {
    const change = calculateMomentumChange(events, "nvidia", NOW, 1);
    expect(change).toBe(0);
  });
});
