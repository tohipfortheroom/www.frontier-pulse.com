import type { NewsItem } from "@/lib/seed/data";

import { companiesBySlug } from "@/lib/seed/data";
import { getSiteUrl } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssFeed({
  title,
  description,
  path,
  items,
}: {
  title: string;
  description: string;
  path: string;
  items: NewsItem[];
}) {
  const siteUrl = getSiteUrl();
  const channelLink = `${siteUrl}${path}`;
  const latestPublishedAt = items[0]?.publishedAt ?? new Date().toISOString();

  const renderedItems = items
    .map((item) => {
      const companies = item.companySlugs.map((slug) => companiesBySlug[slug]?.name ?? slug).join(", ");
      const link = `${siteUrl}/news#${item.slug}`;
      const descriptionParts = [item.summary, item.whyItMatters, companies ? `Companies: ${companies}` : ""]
        .filter(Boolean)
        .join(" ");

      return [
        "<item>",
        `<title>${escapeXml(item.headline)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid>${escapeXml(link)}</guid>`,
        `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>`,
        `<description>${escapeXml(descriptionParts)}</description>`,
        "</item>",
      ].join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(latestPublishedAt).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(channelLink)}" rel="self" type="application/rss+xml" />
    ${renderedItems}
  </channel>
</rss>`;
}
