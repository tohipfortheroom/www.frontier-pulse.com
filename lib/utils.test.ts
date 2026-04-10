import { describe, expect, it, vi } from "vitest";

import { formatLastUpdatedLabel } from "@/lib/utils";

describe("formatLastUpdatedLabel", () => {
  it("does not report recent module freshness as just now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));

    expect(formatLastUpdatedLabel("2026-04-10T11:40:00.000Z")).toBe("Last updated: <1h ago");

    vi.useRealTimers();
  });
});
