import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/error-utils";
import { runPriorityCronIngestion } from "@/lib/ingestion/cron";
import { isCronAuthorized } from "@/lib/ingestion/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPriorityCronIngestion();
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][ingest-priority] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPriorityCronIngestion();
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[cron][ingest-priority] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
