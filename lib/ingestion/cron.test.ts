import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRunIngestionPipeline,
  mockRunPriorityIngestion,
  mockGenerateDailyDigest,
  mockRecomputeLeaderboardFromNews,
} = vi.hoisted(() => ({
  mockRunIngestionPipeline: vi.fn(),
  mockRunPriorityIngestion: vi.fn(),
  mockGenerateDailyDigest: vi.fn(),
  mockRecomputeLeaderboardFromNews: vi.fn(),
}));

vi.mock("./pipeline.ts", () => ({
  runIngestionPipeline: mockRunIngestionPipeline,
  runPriorityIngestion: mockRunPriorityIngestion,
}));

vi.mock("./digest-generator.ts", () => ({
  generateDailyDigest: mockGenerateDailyDigest,
}));

vi.mock("./leaderboard.ts", () => ({
  recomputeLeaderboardFromNews: mockRecomputeLeaderboardFromNews,
}));

vi.mock("../monitoring/logger.ts", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { runCronIngestion } from "./cron.ts";

describe("runCronIngestion", () => {
  beforeEach(() => {
    mockRunIngestionPipeline.mockReset();
    mockRunPriorityIngestion.mockReset();
    mockGenerateDailyDigest.mockReset();
    mockRecomputeLeaderboardFromNews.mockReset();

    mockRunIngestionPipeline.mockResolvedValue({
      runId: "run-1",
      pipelineName: "frontier-pulse",
      triggerKind: "cron",
      targetScope: "all",
      status: "success",
      statusReason: "Stored new stories.",
      startedAt: "2026-04-10T12:00:00.000Z",
      completedAt: "2026-04-10T12:00:05.000Z",
      durationMs: 5000,
      sourceCount: 10,
      sourceSuccessCount: 10,
      sourceFailureCount: 0,
      fetchedCount: 25,
      normalizedCount: 18,
      insertedCount: 12,
      updatedCount: 4,
      storedCount: 16,
      duplicatesFiltered: 2,
      invalidRejected: 1,
      oldRejected: 0,
      dryRun: false,
      overlapPrevented: false,
      lastIngestionAt: "2026-04-10T12:00:05.000Z",
      errors: [],
      items: [],
      sourceStatuses: [],
      staleSourceIds: [],
      sources: [],
      health: {},
    });
    mockRecomputeLeaderboardFromNews.mockResolvedValue({
      eventsGenerated: 12,
      momentumRows: 10,
      calculatedAt: "2026-04-10T12:00:06.000Z",
    });
    mockGenerateDailyDigest.mockResolvedValue({
      generated: true,
      stored: true,
      digestDate: "2026-04-10",
      storyCount: 8,
      usedLlm: false,
    });
  });

  it("runs leaderboard recompute and digest generation after successful ingestion", async () => {
    const result = await runCronIngestion();

    expect(mockRecomputeLeaderboardFromNews).toHaveBeenCalledTimes(1);
    expect(mockGenerateDailyDigest).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("success");
    expect(result.leaderboard.status).toBe("success");
    expect(result.digest.status).toBe("success");
  });

  it("degrades to partial success when downstream follow-up fails", async () => {
    mockRecomputeLeaderboardFromNews.mockRejectedValueOnce(new Error("recompute failed"));

    const result = await runCronIngestion();

    expect(mockGenerateDailyDigest).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("partial_success");
    expect(result.statusReason).toContain("Downstream follow-up failed");
    expect(result.leaderboard.status).toBe("error");
    expect(result.digest.status).toBe("success");
  });
});
