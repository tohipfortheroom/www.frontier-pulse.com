import { NextRequest, NextResponse } from "next/server";

import { getSupabaseReadClient, getSupabaseServiceClient } from "@/lib/db/client";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { reactionSeed, type ReactionType } from "@/lib/seed/data";

export const runtime = "nodejs";

const REACTION_TYPES: ReactionType[] = ["fire", "mind_blown", "bearish", "bullish", "yawn"];

/** In-memory store for demo mode (no Supabase). */
const demoReactions = new Map<string, Map<string, ReactionType>>();

function emptyCounts(): Record<ReactionType, number> {
  return {
    fire: 0,
    mind_blown: 0,
    bearish: 0,
    bullish: 0,
    yawn: 0,
  };
}

function seedCountsForSlug(slug: string): Record<ReactionType, number> {
  const fallback = reactionSeed.find((entry) => entry.newsSlug === slug);
  return {
    ...emptyCounts(),
    ...(fallback?.counts ?? {}),
  };
}

function getDemoSummary(slug: string, visitorId: string) {
  const base = seedCountsForSlug(slug);
  const slugReactions = demoReactions.get(slug);
  let selected: ReactionType | null = null;

  if (slugReactions) {
    for (const [vid, rType] of slugReactions) {
      base[rType] += 1;
      if (vid === visitorId) {
        selected = rType;
      }
    }
  }

  return { slug, counts: base, selected };
}

function toggleDemo(slug: string, visitorId: string, reactionType: ReactionType) {
  if (!demoReactions.has(slug)) {
    demoReactions.set(slug, new Map());
  }

  const slugReactions = demoReactions.get(slug)!;
  const existing = slugReactions.get(visitorId);

  if (existing === reactionType) {
    slugReactions.delete(visitorId);
  } else {
    slugReactions.set(visitorId, reactionType);
  }

  return getDemoSummary(slug, visitorId);
}

async function resolveNewsItemId(slug: string): Promise<string | null> {
  const client = getSupabaseReadClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.from("news_items").select("id").eq("slug", slug).maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

async function buildSummary(slug: string, newsItemId: string | null, visitorId: string) {
  const fallbackCounts = seedCountsForSlug(slug);
  const client = getSupabaseReadClient();

  if (!client || !newsItemId) {
    return getDemoSummary(slug, visitorId);
  }

  const { data, error } = await client
    .from("reactions")
    .select("reaction_type, visitor_id")
    .eq("news_item_id", newsItemId);

  if (error || !data) {
    return {
      slug,
      counts: fallbackCounts,
      selected: null,
    };
  }

  const counts = emptyCounts();
  let selected: ReactionType | null = null;

  for (const row of data as Array<{ reaction_type: ReactionType; visitor_id: string }>) {
    counts[row.reaction_type] += 1;
    if (row.visitor_id === visitorId) {
      selected = row.reaction_type;
    }
  }

  return { slug, counts, selected };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  const visitorId =
    request.headers.get("x-visitor-id")?.trim() ||
    request.nextUrl.searchParams.get("visitorId")?.trim() ||
    "anonymous";

  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const newsItemId = await resolveNewsItemId(slug);

  if (!newsItemId) {
    return NextResponse.json(getDemoSummary(slug, visitorId));
  }

  return NextResponse.json(await buildSummary(slug, newsItemId, visitorId));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    visitorId?: string;
    reactionType?: ReactionType;
  } | null;

  const slug = body?.slug?.trim();
  const visitorId = body?.visitorId?.trim();
  const reactionType = body?.reactionType;

  if (!slug || !visitorId || !reactionType || !REACTION_TYPES.includes(reactionType)) {
    return NextResponse.json({ error: "Invalid reaction payload." }, { status: 400 });
  }

  const rateLimit = enforceRateLimit({
    namespace: "api-reactions",
    key: visitorId,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many reactions. Please wait a minute and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const newsItemId = await resolveNewsItemId(slug);
  const client = getSupabaseServiceClient();

  if (!client || !newsItemId) {
    return NextResponse.json(toggleDemo(slug, visitorId, reactionType));
  }

  const { data: existing, error: existingError } = await client
    .from("reactions")
    .select("id")
    .eq("news_item_id", newsItemId)
    .eq("reaction_type", reactionType)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Unable to update reactions right now." }, { status: 500 });
  }

  if (existing?.id) {
    const { error } = await client.from("reactions").delete().eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "Unable to remove your reaction right now." }, { status: 500 });
    }
  } else {
    const { error } = await client.from("reactions").insert({
      news_item_id: newsItemId,
      reaction_type: reactionType,
      visitor_id: visitorId,
    });

    if (error) {
      return NextResponse.json({ error: "Unable to save your reaction right now." }, { status: 500 });
    }
  }

  return NextResponse.json(await buildSummary(slug, newsItemId, visitorId));
}
