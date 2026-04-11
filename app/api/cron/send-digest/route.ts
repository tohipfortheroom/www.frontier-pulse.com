import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/error-utils";
import { sendDailyDigest } from "@/lib/email/digest-sender";
import { isCronAuthorized } from "@/lib/ingestion/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleSendDigest(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyDigest();

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("[send-digest] Cron failed:", message);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleSendDigest(request);
}

export async function POST(request: Request) {
  return handleSendDigest(request);
}
