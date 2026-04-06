import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/ingestion/cron-auth";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    maxAgeDays?: number;
    sources?: string[];
  } | null;

  const maxAgeDays = Math.min(payload?.maxAgeDays ?? 30, 90);

  const result = await runIngestionPipeline({
    triggerKind: "manual",
    targetScope: payload?.sources ? "selected" : "all",
    selectedSourceIds: payload?.sources,
    maxAgeOverrideHours: maxAgeDays * 24,
  });

  return NextResponse.json({
    status: result.status,
    statusReason: result.statusReason,
    durationMs: result.durationMs,
    sourceCount: result.sourceCount,
    sourceSuccessCount: result.sourceSuccessCount,
    fetchedCount: result.fetchedCount,
    normalizedCount: result.normalizedCount,
    insertedCount: result.insertedCount,
    updatedCount: result.updatedCount,
    duplicatesFiltered: result.duplicatesFiltered,
    oldRejected: result.oldRejected,
    sampleHeadlines: result.items.slice(0, 15).map((item) => item.headline),
  });
}
