import { randomBytes } from "node:crypto";

import { getSupabaseServerClient } from "@/lib/db/client";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
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
