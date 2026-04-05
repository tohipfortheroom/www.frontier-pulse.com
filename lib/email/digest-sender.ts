import { getSupabaseServiceClient } from "@/lib/db/client";
import { getDailyDigestData } from "@/lib/db/queries";
import { buildDigestEmailHtml } from "@/lib/email/templates/daily-digest";
import type { MomentumSnapshot } from "@/lib/seed/data";

type Subscriber = {
  id: string;
  email: string;
  unsubscribe_token: string;
};

type SendResult = {
  sent: number;
  failed: number;
  skipped: number;
};

const BATCH_SIZE = 50;
const RESEND_API_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

async function getSubscribers(): Promise<Subscriber[]> {
  const client = getSupabaseServiceClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("subscribers")
    .select("id, email, unsubscribe_token")
    .eq("confirmed", true)
    .is("unsubscribed_at", null);

  if (error) {
    console.error("[digest-sender] Failed to fetch subscribers:", error.message);
    return [];
  }

  return (data as Subscriber[]) ?? [];
}

async function getLeaderboard(): Promise<MomentumSnapshot[]> {
  const client = getSupabaseServiceClient();
  if (!client) {
    // Fall back to seed data via queries — getDailyDigestData provides partial info
    return [];
  }

  const { data, error } = await client
    .from("momentum_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(5);

  if (error || !data) {
    return [];
  }

  // Map DB rows to MomentumSnapshot shape for the template
  return data.map((row: Record<string, unknown>, index: number) => ({
    companySlug: String(row.company_id ?? ""),
    rank: index + 1,
    score: Number(row.score ?? 0),
    scoreChange24h: Number(row.score_change_24h ?? 0),
    scoreChange7d: Number(row.score_change_7d ?? 0),
    trend: (Number(row.score_change_24h ?? 0) > 0 ? "up" : Number(row.score_change_24h ?? 0) < 0 ? "down" : "stable") as MomentumSnapshot["trend"],
    keyDriver: "",
    sparkline: [],
    driverNewsSlugs: [],
  }));
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return false;
  }

  const fromAddress = process.env.RESEND_FROM_ADDRESS ?? "Frontier Pulse <digest@frontierpulse.ai>";

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown error");
      console.error(`[digest-sender] Resend API error for ${to}: ${response.status} - ${errorBody}`);
      return false;
    }

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[digest-sender] Network error sending to ${to}:`, message);
    return false;
  }
}

async function sendBatch(
  subscribers: Subscriber[],
  subject: string,
  digestData: Awaited<ReturnType<typeof getDailyDigestData>>,
  leaderboard: MomentumSnapshot[],
  siteUrl: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    subscribers.map(async (subscriber) => {
      const html = buildDigestEmailHtml({
        digest: digestData,
        leaderboard,
        subscriberEmail: subscriber.email,
        unsubscribeToken: subscriber.unsubscribe_token,
        siteUrl,
      });

      return sendEmailViaResend(subscriber.email, subject, html);
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendDailyDigest(): Promise<SendResult> {
  if (!isEmailConfigured()) {
    console.log("[digest-sender] RESEND_API_KEY not set, skipping email digest.");
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const [digestData, subscribers, leaderboard] = await Promise.all([
    getDailyDigestData(),
    getSubscribers(),
    getLeaderboard(),
  ]);

  if (subscribers.length === 0) {
    console.log("[digest-sender] No subscribers found, skipping.");
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const siteUrl = getSiteUrl();
  const subject = `Frontier Pulse: ${digestData.digest.title} - ${digestData.digest.date}`;

  let totalSent = 0;
  let totalFailed = 0;

  // Send in batches of BATCH_SIZE
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    const { sent, failed } = await sendBatch(batch, subject, digestData, leaderboard, siteUrl);
    totalSent += sent;
    totalFailed += failed;
  }

  console.log(
    `[digest-sender] Digest complete: ${totalSent} sent, ${totalFailed} failed, 0 skipped`,
  );

  return {
    sent: totalSent,
    failed: totalFailed,
    skipped: 0,
  };
}
