import { addDays, format, isAfter } from "date-fns";

import { recomputeLeaderboardFromNews } from "../lib/ingestion/leaderboard.ts";

function parseDateInput(value: string | undefined, fallback: string) {
  const resolved = value?.trim() || fallback;
  const parsed = new Date(`${resolved}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${resolved}`);
  }

  return parsed;
}

function toReferenceDate(date: Date) {
  return new Date(`${format(date, "yyyy-MM-dd")}T23:59:59.999Z`);
}

async function main() {
  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = parseDateInput(process.env.RECOMPUTE_START_DATE, today);
  const endDate = parseDateInput(process.env.RECOMPUTE_END_DATE, format(startDate, "yyyy-MM-dd"));

  if (isAfter(startDate, endDate)) {
    throw new Error("RECOMPUTE_START_DATE must be on or before RECOMPUTE_END_DATE.");
  }

  console.log(`Recomputing leaderboard scores from ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}...`);

  let cursor = startDate;
  while (!isAfter(cursor, endDate)) {
    const dateKey = format(cursor, "yyyy-MM-dd");
    const result = await recomputeLeaderboardFromNews(toReferenceDate(cursor));
    console.log(`  ${dateKey}: recalculated${result.historyPersisted ? "" : " (history table unavailable; using momentum_scores only)"}`);
    cursor = addDays(cursor, 1);
  }
}

main().catch((error) => {
  console.error("Recompute failed:", error);
  process.exit(1);
});
