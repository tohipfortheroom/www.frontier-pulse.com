import { NextResponse } from "next/server";

import { runPriorityCronIngestion } from "@/lib/ingestion/cron";
import { isCronAuthorized } from "@/lib/ingestion/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPriorityCronIngestion();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPriorityCronIngestion();
  return NextResponse.json(result);
}
