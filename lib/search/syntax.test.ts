import { describe, expect, it } from "vitest";

import { extractDateFilters, getTextQuery, matchesSearchQuery, normalizeSearchInput } from "./syntax";

describe("normalizeSearchInput", () => {
  it("replaces pipe with OR", () => {
    expect(normalizeSearchInput("a | b")).toBe("a OR b");
  });

  it("collapses whitespace", () => {
    expect(normalizeSearchInput("hello   world")).toBe("hello world");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeSearchInput("  hello  ")).toBe("hello");
  });
});

describe("matchesSearchQuery", () => {
  const text = "OpenAI launches GPT-5 with advanced reasoning capabilities";

  it("returns true for empty query", () => {
    expect(matchesSearchQuery(text, "")).toBe(true);
    expect(matchesSearchQuery(text, "   ")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesSearchQuery(text, "openai")).toBe(true);
    expect(matchesSearchQuery(text, "OPENAI")).toBe(true);
    expect(matchesSearchQuery(text, "OpenAI")).toBe(true);
  });

  it("matches single terms", () => {
    expect(matchesSearchQuery(text, "GPT-5")).toBe(true);
    expect(matchesSearchQuery(text, "reasoning")).toBe(true);
  });

  it("requires all terms in AND mode", () => {
    expect(matchesSearchQuery(text, "openai gpt-5")).toBe(true);
    expect(matchesSearchQuery(text, "openai claude")).toBe(false);
  });

  it("supports OR operator", () => {
    expect(matchesSearchQuery(text, "claude OR openai")).toBe(true);
    expect(matchesSearchQuery(text, "claude OR gemini")).toBe(false);
  });

  it("supports negation with -", () => {
    expect(matchesSearchQuery(text, "openai -claude")).toBe(true);
    expect(matchesSearchQuery(text, "openai -gpt-5")).toBe(false);
  });

  it("supports quoted phrases", () => {
    expect(matchesSearchQuery(text, '"GPT-5 with"')).toBe(true);
    expect(matchesSearchQuery(text, '"GPT-5 launches"')).toBe(false);
  });

  it("supports negated quoted phrases", () => {
    expect(matchesSearchQuery(text, 'openai -"claude model"')).toBe(true);
    expect(matchesSearchQuery(text, 'openai -"advanced reasoning"')).toBe(false);
  });

  it("handles complex queries with OR and negation", () => {
    expect(matchesSearchQuery(text, 'openai gpt-5 OR anthropic claude')).toBe(true);
    expect(matchesSearchQuery(text, "nvidia -openai OR anthropic -openai")).toBe(false);
  });

  it("handles pipe as OR alias", () => {
    expect(matchesSearchQuery(text, "claude | openai")).toBe(true);
  });

  it("filters by after: date operator", () => {
    const publishedAt = "2026-03-15T10:00:00Z";
    expect(matchesSearchQuery(text, "openai after:2026-03-01", publishedAt)).toBe(true);
    expect(matchesSearchQuery(text, "openai after:2026-04-01", publishedAt)).toBe(false);
  });

  it("filters by before: date operator", () => {
    const publishedAt = "2026-03-15T10:00:00Z";
    expect(matchesSearchQuery(text, "openai before:2026-04-01", publishedAt)).toBe(true);
    expect(matchesSearchQuery(text, "openai before:2026-03-01", publishedAt)).toBe(false);
  });

  it("combines date operators with text search", () => {
    const publishedAt = "2026-03-15T10:00:00Z";
    expect(matchesSearchQuery(text, "openai after:2026-03-01 before:2026-04-01", publishedAt)).toBe(true);
    expect(matchesSearchQuery(text, "claude after:2026-03-01 before:2026-04-01", publishedAt)).toBe(false);
  });

  it("handles date-only query (no text)", () => {
    const publishedAt = "2026-03-15T10:00:00Z";
    expect(matchesSearchQuery(text, "after:2026-03-01", publishedAt)).toBe(true);
    expect(matchesSearchQuery(text, "after:2026-04-01", publishedAt)).toBe(false);
  });
});

describe("extractDateFilters", () => {
  it("extracts before date", () => {
    const filters = extractDateFilters("openai before:2026-04-01");
    expect(filters.before).toBeDefined();
    expect(filters.before!.toISOString()).toBe("2026-04-01T23:59:59.000Z");
    expect(filters.after).toBeUndefined();
  });

  it("extracts after date", () => {
    const filters = extractDateFilters("openai after:2026-03-01");
    expect(filters.after).toBeDefined();
    expect(filters.after!.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(filters.before).toBeUndefined();
  });

  it("extracts both dates", () => {
    const filters = extractDateFilters("after:2026-03-01 before:2026-04-01");
    expect(filters.after).toBeDefined();
    expect(filters.before).toBeDefined();
  });

  it("returns empty for no date operators", () => {
    const filters = extractDateFilters("openai gpt-5");
    expect(filters.before).toBeUndefined();
    expect(filters.after).toBeUndefined();
  });
});

describe("getTextQuery", () => {
  it("strips date operators", () => {
    expect(getTextQuery("openai after:2026-03-01")).toBe("openai");
  });

  it("strips multiple date operators", () => {
    expect(getTextQuery("openai after:2026-03-01 before:2026-04-01")).toBe("openai");
  });

  it("returns empty for date-only query", () => {
    expect(getTextQuery("after:2026-03-01")).toBe("");
  });

  it("preserves non-date terms", () => {
    expect(getTextQuery("openai gpt-5")).toBe("openai gpt-5");
  });
});
