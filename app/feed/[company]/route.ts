import { getCompanyDetailData, getNewsItemsData } from "@/lib/db/queries";
import { BRAND_NAME } from "@/lib/brand";
import { buildRssFeed } from "@/lib/rss";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ company: string }>;
  },
) {
  const { company: slug } = await params;
  const [record, newsItems] = await Promise.all([getCompanyDetailData(slug), getNewsItemsData()]);

  if (!record) {
    return new Response("Not found", { status: 404 });
  }

  const companyNews = newsItems.filter((item) => item.companySlugs.includes(record.company.slug)).slice(0, 50);

  const xml = buildRssFeed({
    title: `${record.company.name} | ${BRAND_NAME}`,
    description: `Latest momentum, launch, and strategy updates for ${record.company.name}.`,
    path: `/feed/${record.company.slug}`,
    items: companyNews,
  });

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
