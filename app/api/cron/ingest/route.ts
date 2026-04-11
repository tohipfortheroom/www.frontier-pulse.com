import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/error-utils";
import { runCronIngestion } from "@/lib/ingestion/cron";
import { isCronAuthorized } from "@/lib/ingestion/cron-auth";
import { CACHE_TAGS } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCronIngestion();
    revalidateTag(CACHE_TAGS.siteContent, "max");
    revalidateTag(CACHE_TAGS.health, "max");

    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][ingest] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCronIngestion();
    revalidateTag(CACHE_TAGS.siteContent, "max");
    revalidateTag(CACHE_TAGS.health, "max");

    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][ingest] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
