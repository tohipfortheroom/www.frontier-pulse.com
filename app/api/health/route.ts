import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/db/client";
import { getSourceHealthSnapshot } from "@/lib/ingestion/source-health";
import { sourceRegistry } from "@/lib/ingestion/pipeline";
import { isLlmConfigured } from "@/lib/llm/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getSourceHealthSnapshot(sourceRegistry);
  const client = getSupabaseServerClient();
  let databaseConnected = false;

  if (client) {
    const { error } = await client.from("companies").select("id").limit(1);
    databaseConnected = !error;
  }

  const latestRun = snapshot.recentRuns[0] ?? null;
  const sourceHealthSummary = {
    healthy: snapshot.sources.filter((source) => !source.stale && !source.degraded && source.status !== "error").length,
    degraded: snapshot.sources.filter((source) => source.degraded || source.status === "degraded").length,
    down: snapshot.sources.filter((source) => source.status === "error").length,
  };
  const httpStatus = snapshot.currentStatus === "LIVE" ? 200 : 503;

  return NextResponse.json(
    {
      ...snapshot,
      lastIngestionRun: latestRun
        ? {
            runId: latestRun.runId,
            status: latestRun.status,
            startedAt: latestRun.startedAt,
            completedAt: latestRun.completedAt,
            durationMs: latestRun.durationMs,
          }
        : null,
      sourceHealthSummary,
      databaseConnected,
      llmAvailable: isLlmConfigured(),
    },
    {
      status: httpStatus,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
    },
  );
}
