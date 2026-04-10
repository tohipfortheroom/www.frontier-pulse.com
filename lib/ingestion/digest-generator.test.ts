import { describe, expect, it } from "vitest";

import { normalizeDigestCategorySlugs } from "./digest-generator.ts";

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
