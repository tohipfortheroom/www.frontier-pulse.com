import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/error-utils";
import { isCronAuthorized } from "@/lib/ingestion/cron-auth";
import { recomputeLeaderboardFromNews } from "@/lib/ingestion/leaderboard";
import { CACHE_TAGS } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getReferenceDate(request: Request) {
  const { searchParams } = new URL(request.url);
  const referenceDate = searchParams.get("referenceDate");

  if (!referenceDate) {
    return undefined;
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  const parsed =
    /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)
      ? new Date(referenceDate === todayKey ? new Date().toISOString() : `${referenceDate}T23:59:59.999Z`)
      : new Date(referenceDate);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid referenceDate: ${referenceDate}`);
  }

  return parsed;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeLeaderboardFromNews(getReferenceDate(request));
    revalidateTag(CACHE_TAGS.siteContent, "max");
    revalidateTag(CACHE_TAGS.health, "max");

    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][recompute-leaderboard] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeLeaderboardFromNews(getReferenceDate(request));
    revalidateTag(CACHE_TAGS.siteContent, "max");
    revalidateTag(CACHE_TAGS.health, "max");

    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][recompute-leaderboard] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
