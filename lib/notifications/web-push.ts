import * as webpush from "web-push";

import { BRAND_NAME, BRAND_UTM_SOURCE } from "@/lib/brand";
import { getSupabaseServiceClient } from "@/lib/db/client";
import type { SummarizedCandidate } from "@/lib/ingestion/types";

type StoredPushSubscription = {
  id: string;
  endpoint: string;
  subscription: webpush.PushSubscription;
};

function hasPushConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

let configured = false;

function ensurePushConfigured() {
  if (!hasPushConfig()) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT as string,
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );
    configured = true;
  }

  return true;
}

export function getPublicVapidKey() {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

export async function sendBreakingNewsNotifications(items: SummarizedCandidate[]) {
  const client = getSupabaseServiceClient();

  if (!client || items.length === 0 || !ensurePushConfigured()) {
    return {
      attempted: 0,
      sent: 0,
    };
  }

  const { data, error } = await client.from("push_subscriptions").select("id, endpoint, subscription");

  if (error || !data || data.length === 0) {
    return {
      attempted: 0,
      sent: 0,
    };
  }

  const subscriptions = data as StoredPushSubscription[];
  let sent = 0;

  for (const item of items) {
    const payload = JSON.stringify({
      title: `${BRAND_NAME} | Breaking Move`,
      body: item.shortSummary,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/news?utm_source=${BRAND_UTM_SOURCE}&utm_medium=push#${item.slug}`,
      headline: item.headline,
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription.subscription, payload);
          sent += 1;
        } catch (error) {
          const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : null;

          if (statusCode === 404 || statusCode === 410) {
            await client.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
      }),
    );
  }

  return {
    attempted: subscriptions.length * items.length,
    sent,
  };
}
