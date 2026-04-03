import { NextResponse } from "next/server";

import { runCronIngestion } from "@/lib/ingestion/cron";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const vercelHeader = request.headers.get("x-vercel-cron");

  if (vercelHeader) {
    return true;
  }

  if (!cronSecret) {
    return false;
  }

  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCronIngestion();

  return NextResponse.json(result);
}
