import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/error-utils";
import { isCronAuthorized } from "@/lib/ingestion/cron-auth";
import { runBackfillIngestion } from "@/lib/ingestion/cron";
import { CACHE_TAGS } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as {
      maxAgeDays?: number;
      sources?: string[];
    } | null;

    const maxAgeDays = Math.min(payload?.maxAgeDays ?? 30, 90);

    const result = await runBackfillIngestion({
      triggerKind: "manual",
      selectedSourceIds: payload?.sources,
      maxAgeOverrideHours: maxAgeDays * 24,
    });
    revalidateTag(CACHE_TAGS.siteContent, "max");
    revalidateTag(CACHE_TAGS.health, "max");

    return NextResponse.json({
      status: result.status,
      statusReason: result.statusReason,
      durationMs: result.durationMs,
      sourceCount: result.sourceCount,
      sourceSuccessCount: result.sourceSuccessCount,
      sourceFailureCount: result.sourceFailureCount,
      fetchedCount: result.fetchedCount,
      normalizedCount: result.normalizedCount,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      duplicatesFiltered: result.duplicatesFiltered,
      oldRejected: result.oldRejected,
      leaderboard: result.leaderboard,
      digest: result.digest,
      downstreamErrors: result.downstreamErrors,
      sampleHeadlines: result.items.slice(0, 15).map((item) => item.headline),
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][backfill] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
