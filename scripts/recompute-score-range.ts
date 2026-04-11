import { addDays, isAfter } from "date-fns";

import { recomputeLeaderboardFromNews } from "../lib/ingestion/leaderboard.ts";

function parseDateInput(value: string | undefined, fallback: string) {
  const resolved = value?.trim() || fallback;
  const parsed = new Date(`${resolved}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${resolved}`);
  }

  return parsed;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toReferenceDate(date: Date) {
  if (toDateKey(date) === toDateKey(new Date())) {
    return new Date();
  }

  return new Date(`${toDateKey(date)}T23:59:59.999Z`);
}

async function main() {
  const today = toDateKey(new Date());
  const startDate = parseDateInput(process.env.RECOMPUTE_START_DATE, today);
  const endDate = parseDateInput(process.env.RECOMPUTE_END_DATE, toDateKey(startDate));

  if (isAfter(startDate, endDate)) {
    throw new Error("RECOMPUTE_START_DATE must be on or before RECOMPUTE_END_DATE.");
  }

  console.log(`Recomputing leaderboard scores from ${toDateKey(startDate)} to ${toDateKey(endDate)}...`);

  let cursor = startDate;
  while (!isAfter(cursor, endDate)) {
    const dateKey = toDateKey(cursor);
    const result = await recomputeLeaderboardFromNews(toReferenceDate(cursor));
    console.log(`  ${dateKey}: recalculated${result.historyPersisted ? "" : " (history table unavailable; using momentum_scores only)"}`);
    cursor = addDays(cursor, 1);
  }
}

main().catch((error) => {
  console.error("Recompute failed:", error);
  process.exit(1);
});
