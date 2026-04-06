import { describe, expect, it } from "vitest";

import { deriveSourceRuntimeState } from "./health-model";

const NOW = new Date("2026-04-06T10:00:00Z");

function minutesAgoIso(minutes: number) {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

describe("deriveSourceRuntimeState", () => {
  it("keeps hourly sources healthy when they are within expected cadence", () => {
    const runtime = deriveSourceRuntimeState(
      {
        lastCheckedAt: minutesAgoIso(70),
        lastSucceededAt: minutesAgoIso(70),
        lastFailedAt: null,
        status: "live",
        consecutiveFailures: 0,
        expectedIntervalMinutes: 60,
      },
      NOW,
    );

    expect(runtime.runtimeState).toBe("healthy");
    expect(runtime.degraded).toBe(false);
    expect(runtime.stale).toBe(false);
  });

  it("does not keep recovered sources degraded from old failure timestamps", () => {
    const runtime = deriveSourceRuntimeState(
      {
        lastCheckedAt: minutesAgoIso(5),
        lastSucceededAt: minutesAgoIso(5),
        lastFailedAt: minutesAgoIso(20),
        status: "live",
        consecutiveFailures: 0,
        expectedIntervalMinutes: 10,
      },
      NOW,
    );

    expect(runtime.runtimeState).toBe("healthy");
    expect(runtime.degraded).toBe(false);
  });

  it("marks ongoing source errors as degraded", () => {
    const runtime = deriveSourceRuntimeState(
      {
        lastCheckedAt: minutesAgoIso(3),
        lastSucceededAt: minutesAgoIso(40),
        lastFailedAt: minutesAgoIso(3),
        status: "error",
        consecutiveFailures: 1,
        expectedIntervalMinutes: 10,
      },
      NOW,
    );

    expect(runtime.runtimeState).toBe("error");
    expect(runtime.degraded).toBe(true);
  });
});
