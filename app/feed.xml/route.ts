import { getNewsItemsData } from "@/lib/db/queries";
import { BRAND_NAME } from "@/lib/brand";
import { buildRssFeed } from "@/lib/rss";
import { getSiteUrlFromRequest } from "@/lib/site";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const newsItems = (await getNewsItemsData()).slice(0, 50);
  const xml = buildRssFeed({
    title: BRAND_NAME,
    description: "The latest AI company momentum moves, launches, partnerships, and breaking news.",
    path: "/feed.xml",
    items: newsItems,
    siteUrl: getSiteUrlFromRequest(request),
  });

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
