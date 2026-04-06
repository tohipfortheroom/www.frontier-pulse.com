import { runIngestionPipeline } from "../lib/ingestion/pipeline.ts";

const DEFAULT_MAX_AGE_HOURS = 30 * 24; // 30 days

async function backfill() {
  const maxAgeHours = Number(process.env.BACKFILL_MAX_AGE_HOURS) || DEFAULT_MAX_AGE_HOURS;
  const sourceFilter = process.env.BACKFILL_SOURCES?.split(",").map((s) => s.trim()).filter(Boolean);

  console.log(`\nBackfill starting...`);
  console.log(`  Max age: ${maxAgeHours} hours (${Math.round(maxAgeHours / 24)} days)`);
  console.log(`  Sources: ${sourceFilter?.join(", ") || "all"}\n`);

  const result = await runIngestionPipeline({
    triggerKind: "cli",
    targetScope: sourceFilter ? "selected" : "all",
    selectedSourceIds: sourceFilter,
    maxAgeOverrideHours: maxAgeHours,
  });

  console.log(`\nBackfill complete in ${result.durationMs}ms`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Sources: ${result.sourceSuccessCount}/${result.sourceCount} succeeded`);
  console.log(`  Fetched: ${result.fetchedCount}`);
  console.log(`  Normalized: ${result.normalizedCount}`);
  console.log(`  Inserted: ${result.insertedCount}`);
  console.log(`  Updated: ${result.updatedCount}`);
  console.log(`  Duplicates filtered: ${result.duplicatesFiltered}`);
  console.log(`  Rejected (too old): ${result.oldRejected}`);
  console.log(`  Rejected (invalid): ${result.invalidRejected}`);

  if (result.items.length > 0) {
    console.log(`\n  Sample headlines:`);
    result.items.slice(0, 10).forEach((item) => {
      console.log(`    - ${item.headline}`);
    });
  }

  if (result.status === "error") {
    console.error(`\n  Error: ${result.statusReason}`);
    process.exit(1);
  }
}

backfill().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
