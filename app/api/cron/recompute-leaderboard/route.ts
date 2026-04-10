import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/ingestion/cron-auth";
import { recomputeLeaderboardFromNews } from "@/lib/ingestion/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeLeaderboardFromNews();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron][recompute-leaderboard] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeLeaderboardFromNews();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron][recompute-leaderboard] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
