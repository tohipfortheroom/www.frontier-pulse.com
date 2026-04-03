import { getSupabaseServerClient } from "@/lib/db/client";

export const runtime = "nodejs";

type PushSubscriptionPayload = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function isValidSubscription(payload: PushSubscriptionPayload | null | undefined): payload is Required<PushSubscriptionPayload> {
  return Boolean(payload?.endpoint && payload?.keys?.auth && payload?.keys?.p256dh);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { subscription?: PushSubscriptionPayload } | null;
  const subscription = body?.subscription;

  if (!isValidSubscription(subscription)) {
    return Response.json({ error: "Invalid push subscription payload." }, { status: 400 });
  }

  const client = getSupabaseServerClient();

  if (!client) {
    return Response.json({ error: "Push notifications are not configured in this environment yet." }, { status: 503 });
  }

  const { error } = await client.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      subscription,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return Response.json({ error: "Unable to save push subscription." }, { status: 500 });
  }

  return Response.json({ status: "subscribed" });
}
