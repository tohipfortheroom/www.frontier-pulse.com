import { getNewsItemsData } from "@/lib/db/queries";
import { buildRssFeed } from "@/lib/rss";

export const runtime = "nodejs";

export async function GET() {
  const newsItems = (await getNewsItemsData()).slice(0, 50);
  const xml = buildRssFeed({
    title: "The AI Company Tracker",
    description: "The latest AI company momentum moves, launches, partnerships, and breaking news.",
    path: "/feed.xml",
    items: newsItems,
  });

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
