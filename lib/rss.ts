import type { NewsItem } from "@/lib/seed/data";

import { companiesBySlug } from "@/lib/seed/data";
import { getSiteUrl } from "@/lib/site";

const XML_TEXT_SANITIZER = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g;
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function toCodePoint(value: string, radix: 10 | 16) {
  const code = Number.parseInt(value, radix);

  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
    return null;
  }

  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (match, decimal) => toCodePoint(decimal, 10) ?? match)
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => toCodePoint(hex, 16) ?? match)
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match);
}

function sanitizeXmlText(value: string) {
  return value.replace(XML_TEXT_SANITIZER, "");
}

function escapeXml(value: string) {
  return sanitizeXmlText(decodeHtmlEntities(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toUnixMillis(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toRssDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback.toUTCString();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? fallback.toUTCString() : parsed.toUTCString();
}

export function buildRssFeed({
  title,
  description,
  path,
  items,
  siteUrl: siteUrlOverride,
}: {
  title: string;
  description: string;
  path: string;
  items: NewsItem[];
  siteUrl?: string;
}) {
  const siteUrl = siteUrlOverride ?? getSiteUrl();
  const channelLink = `${siteUrl}${path}`;
  const generatedAt = new Date();
  const sortedItems = items.slice().sort((left, right) => toUnixMillis(right.publishedAt) - toUnixMillis(left.publishedAt));
  const latestPublishedAt = toRssDate(sortedItems[0]?.publishedAt, generatedAt);

  const renderedItems = sortedItems
    .map((item) => {
      const companies = item.companySlugs.map((slug) => companiesBySlug[slug]?.name ?? slug).join(", ");
      const link = `${siteUrl}/news#${item.slug}`;
      const descriptionParts = [item.summary, item.whyItMatters, companies ? `Companies: ${companies}` : ""]
        .filter(Boolean)
        .join(" ");
      const source =
        item.sourceName && item.sourceUrl
          ? `<source url="${escapeXml(item.sourceUrl)}">${escapeXml(item.sourceName)}</source>`
          : "";
      const companyCategories = item.companySlugs
        .map((slug) => companiesBySlug[slug]?.name ?? slug)
        .map((name) => `<category>${escapeXml(name)}</category>`)
        .join("");

      return [
        "<item>",
        `<title>${escapeXml(item.headline)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid isPermaLink="false">${escapeXml(item.slug)}</guid>`,
        `<pubDate>${toRssDate(item.publishedAt, generatedAt)}</pubDate>`,
        `<description>${escapeXml(descriptionParts)}</description>`,
        source,
        companyCategories,
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
    <pubDate>${latestPublishedAt}</pubDate>
    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>
    <ttl>5</ttl>
    <atom:link href="${escapeXml(channelLink)}" rel="self" type="application/rss+xml" />
    ${renderedItems}
  </channel>
</rss>`;
}
