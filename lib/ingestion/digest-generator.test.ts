import { describe, expect, it } from "vitest";

import { getDigestDateWindow, normalizeDigestCategorySlugs } from "./digest-generator.ts";

describe("normalizeDigestCategorySlugs", () => {
  it("forces research-repository stories out of launch categories", () => {
    expect(normalizeDigestCategorySlugs(["product-launch", "benchmark"], "research-repository")).toEqual([
      "research",
      "benchmark",
    ]);
  });

  it("preserves normal category labels for non-research sources", () => {
    expect(normalizeDigestCategorySlugs(["product-launch", "partnership"], "major-media")).toEqual([
      "product-launch",
      "partnership",
    ]);
  });
});

describe("getDigestDateWindow", () => {
  it("uses the selected calendar day instead of a rolling last-24-hours window", () => {
    expect(getDigestDateWindow(new Date("2026-04-10T18:45:00.000Z"))).toEqual({
      digestDate: "2026-04-10",
      windowStart: "2026-04-10T00:00:00.000Z",
      windowEnd: "2026-04-11T00:00:00.000Z",
    });
  });
});
