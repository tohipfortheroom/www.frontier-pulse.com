import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/ingestion/cron-auth";
import { recomputeLeaderboardFromNews } from "@/lib/ingestion/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await recomputeLeaderboardFromNews();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await recomputeLeaderboardFromNews();

  return NextResponse.json(result);
}
