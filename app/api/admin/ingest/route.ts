import { NextResponse } from "next/server";

import { isAdminEnabled } from "@/lib/admin";
import { runCronIngestion, runPriorityCronIngestion } from "@/lib/ingestion/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as { target?: "main" | "priority" } | null;
  const target = payload?.target === "priority" ? "priority" : "main";
  const result =
    target === "priority"
      ? await runPriorityCronIngestion("manual")
      : await runCronIngestion("manual");

  return NextResponse.json(result);
}
