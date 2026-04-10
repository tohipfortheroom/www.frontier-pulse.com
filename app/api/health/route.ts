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
  let operationalStatus: {
    scoring: { lastCalculatedAt: string | null; rowCount: number | null };
    digest: { latestDigestDate: string | null; generatedAt: string | null; rowCount: number | null };
    events: { latestEventDate: string | null; rowCount: number | null };
    news: { latestPublishedAt: string | null; rowCount: number | null };
  } | null = null;

  if (client) {
    const [databaseCheck, newsRows, momentumRows, digestRows, eventRows] = await Promise.all([
      client.from("companies").select("id").limit(1),
      client.from("news_items").select("published_at", { count: "exact" }).order("published_at", { ascending: false }).limit(1),
      client.from("momentum_scores").select("calculated_at", { count: "exact" }).order("calculated_at", { ascending: false }).limit(1),
      client.from("daily_digests").select("digest_date, created_at", { count: "exact" }).order("digest_date", { ascending: false }).limit(1),
      client.from("events").select("event_date", { count: "exact" }).order("event_date", { ascending: false }).limit(1),
    ]);
    databaseConnected = !databaseCheck.error;
    operationalStatus = {
      scoring: {
        lastCalculatedAt: momentumRows.data?.[0]?.calculated_at ?? null,
        rowCount: momentumRows.count ?? null,
      },
      digest: {
        latestDigestDate: digestRows.data?.[0]?.digest_date ?? null,
        generatedAt: digestRows.data?.[0]?.created_at ?? null,
        rowCount: digestRows.count ?? null,
      },
      events: {
        latestEventDate: eventRows.data?.[0]?.event_date ?? null,
        rowCount: eventRows.count ?? null,
      },
      news: {
        latestPublishedAt: newsRows.data?.[0]?.published_at ?? null,
        rowCount: newsRows.count ?? null,
      },
    };
  }

  const latestRun = snapshot.recentRuns[0] ?? null;
  const sourceHealthSummary = {
    healthy: snapshot.sources.filter((source) => !source.stale && !source.degraded && source.status !== "error").length,
    degraded: snapshot.sources.filter((source) => source.degraded || source.status === "degraded").length,
    down: snapshot.sources.filter((source) => source.status === "error").length,
  };
  const httpStatus = snapshot.currentStatus === "STALE" ? 503 : 200;

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
      operationalStatus,
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
