import { randomBytes } from "node:crypto";

import { getSupabaseServerClient } from "@/lib/db/client";
import { enforceRateLimit, getRequestIdentity } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit({
    namespace: "api-subscribe",
    key: getRequestIdentity(request),
    limit: 3,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: "Too many subscribe attempts. Please wait a minute and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const client = getSupabaseServerClient();

  if (!client) {
    return Response.json({ error: "Newsletter signup is not configured in this environment yet." }, { status: 503 });
  }

  const { data: existing, error: existingError } = await client
    .from("subscribers")
    .select("id, confirmed")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: "Unable to check subscription status right now." }, { status: 500 });
  }

  if (existing?.confirmed) {
    return Response.json({ status: "already-subscribed" });
  }

  const payload = {
    email,
    subscribed_at: new Date().toISOString(),
    confirmed: existing?.confirmed ?? false,
    unsubscribe_token: randomBytes(18).toString("hex"),
  };

  const operation = existing
    ? client.from("subscribers").update(payload).eq("id", existing.id)
    : client.from("subscribers").insert(payload);

  const { error } = await operation;

  if (error) {
    return Response.json({ error: "Unable to save your subscription right now." }, { status: 500 });
  }

  return Response.json({ status: "subscribed" });
}
