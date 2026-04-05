import { generateDailyDigest } from "./digest-generator.ts";
import { runIngestionPipeline, runPriorityIngestion } from "./pipeline.ts";
import type { PipelineTriggerKind } from "./types.ts";

export async function runCronIngestion(triggerKind: PipelineTriggerKind = "cron") {
  const ingestion = await runIngestionPipeline({
    triggerKind,
    targetScope: "all",
  });
  const digest =
    !ingestion.dryRun && (ingestion.status === "success" || ingestion.status === "partial_success")
      ? await generateDailyDigest()
      : {
          generated: false,
          stored: false,
          digestDate: new Date().toISOString().slice(0, 10),
          storyCount: 0,
          usedLlm: false,
          reason: "ingestion-not-successful",
        };

  if (ingestion.staleSourceIds.length > 0) {
    console.warn(`Stale sources detected: ${ingestion.staleSourceIds.join(", ")}`);
  }

  return {
    ...ingestion,
    digest,
  };
}

export async function runPriorityCronIngestion(triggerKind: PipelineTriggerKind = "priority-cron") {
  const ingestion = await runPriorityIngestion(triggerKind);

  if (ingestion.staleSourceIds.length > 0) {
    console.warn(`Stale sources detected: ${ingestion.staleSourceIds.join(", ")}`);
  }

  return ingestion;
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
