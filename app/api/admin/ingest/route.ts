import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { isAdminEnabled } from "@/lib/admin";
import { runCronIngestion, runPriorityCronIngestion } from "@/lib/ingestion/cron";
import { CACHE_TAGS } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (adminSecret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = (await request.json().catch(() => null)) as { target?: "main" | "priority" } | null;
  const target = payload?.target === "priority" ? "priority" : "main";
  const result =
    target === "priority"
      ? await runPriorityCronIngestion("manual")
      : await runCronIngestion("manual");
  revalidateTag(CACHE_TAGS.siteContent, "max");
  revalidateTag(CACHE_TAGS.health, "max");

  return NextResponse.json(result);
}
