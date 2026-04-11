import { logger } from "../monitoring/logger.ts";
import { getErrorMessage } from "../error-utils.ts";
import { generateDailyDigest } from "./digest-generator.ts";
import { recomputeLeaderboardFromNews } from "./leaderboard.ts";
import { runIngestionPipeline, runPriorityIngestion } from "./pipeline.ts";
import type { PipelineTriggerKind } from "./types.ts";

type DownstreamTaskResult<T> = {
  task: "leaderboard" | "digest";
  status: "success" | "error" | "skipped";
  ran: boolean;
  finishedAt: string;
  error?: string;
  result?: T;
};

function skippedTask<T>(task: DownstreamTaskResult<T>["task"], reason: string): DownstreamTaskResult<T> {
  return {
    task,
    status: "skipped",
    ran: false,
    finishedAt: new Date().toISOString(),
    error: reason,
  };
}

async function runDownstreamTask<T>(
  task: DownstreamTaskResult<T>["task"],
  action: () => Promise<T>,
): Promise<DownstreamTaskResult<T>> {
  try {
    const result = await action();
    const payload = {
      task,
      status: "success",
      ran: true,
      finishedAt: new Date().toISOString(),
      result,
    } satisfies DownstreamTaskResult<T>;
    logger.info("ingestion", `${task}_completed`, {
      task,
      finishedAt: payload.finishedAt,
    });
    return payload;
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("ingestion", `${task}_failed`, {
      task,
      error: message,
    });
    return {
      task,
      status: "error",
      ran: true,
      finishedAt: new Date().toISOString(),
      error: message,
    };
  }
}

async function runTimedCronTask<T>(task: string, action: () => Promise<T>) {
  const startedAt = Date.now();
  logger.info("ingestion", `${task}_started`, {
    task,
    startedAt: new Date(startedAt).toISOString(),
  });

  try {
    const result = await action();
    logger.info("ingestion", `${task}_completed`, {
      task,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logger.error("ingestion", `${task}_failed`, {
      task,
      durationMs: Date.now() - startedAt,
      error: getErrorMessage(error),
    });
    throw error;
  }
}

async function appendDownstreamTasks(ingestion: Awaited<ReturnType<typeof runIngestionPipeline>>) {
  const shouldRunDownstream = !ingestion.dryRun && (ingestion.status === "success" || ingestion.status === "partial_success");
  const leaderboard = shouldRunDownstream
    ? await runDownstreamTask("leaderboard", () => recomputeLeaderboardFromNews())
    : skippedTask("leaderboard", "ingestion-not-successful");
  const digest = shouldRunDownstream
    ? await runDownstreamTask("digest", () => generateDailyDigest())
    : skippedTask("digest", "ingestion-not-successful");
  const downstreamErrors = [leaderboard, digest]
    .filter((task) => task.status === "error")
    .map((task) => `${task.task}: ${task.error ?? "unknown error"}`);
  const status =
    ingestion.status === "error" || ingestion.status === "skipped"
      ? ingestion.status
      : downstreamErrors.length > 0
        ? "partial_success"
        : ingestion.status;
  const statusReason =
    downstreamErrors.length > 0
      ? `${ingestion.statusReason} Downstream follow-up failed: ${downstreamErrors.join("; ")}`
      : ingestion.statusReason;

  if (ingestion.staleSourceIds.length > 0) {
    console.warn(`Stale sources detected: ${ingestion.staleSourceIds.join(", ")}`);
  }

  return {
    ...ingestion,
    status,
    statusReason,
    leaderboard,
    digest,
    downstreamErrors,
  };
}

export async function runCronIngestion(triggerKind: PipelineTriggerKind = "cron") {
  return runTimedCronTask("cron_ingestion", async () => {
    const ingestion = await runIngestionPipeline({
      triggerKind,
      targetScope: "all",
    });

    return appendDownstreamTasks(ingestion);
  });
}

export async function runBackfillIngestion({
  triggerKind = "manual",
  selectedSourceIds,
  maxAgeOverrideHours,
}: {
  triggerKind?: Extract<PipelineTriggerKind, "manual" | "cli">;
  selectedSourceIds?: string[];
  maxAgeOverrideHours?: number;
} = {}) {
  return runTimedCronTask("backfill_ingestion", async () => {
    const ingestion = await runIngestionPipeline({
      triggerKind,
      targetScope: selectedSourceIds?.length ? "selected" : "all",
      selectedSourceIds,
      maxAgeOverrideHours,
    });

    return appendDownstreamTasks(ingestion);
  });
}

export async function runPriorityCronIngestion(triggerKind: PipelineTriggerKind = "priority-cron") {
  return runTimedCronTask("priority_cron_ingestion", async () => {
    const ingestion = await runPriorityIngestion(triggerKind);

    if (ingestion.staleSourceIds.length > 0) {
      console.warn(`Stale sources detected: ${ingestion.staleSourceIds.join(", ")}`);
    }

    return ingestion;
  });
}

if (process.argv[1]?.endsWith("cron.ts")) {
  runCronIngestion()
    .then((result) => {
      console.log(
        JSON.stringify(
          {
            ...result,
            previewHeadlines: result.items.slice(0, 5).map((item) => item.headline),
            items: undefined,
          },
          null,
          2,
        ),
      );
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
