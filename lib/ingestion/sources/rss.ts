import { passesSourceFilters } from "../keywords.ts";
import type { RawIngestedItem, SourceDefinition } from "../types.ts";

function decodeXmlEntities(input: string) {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(input: string) {
  return decodeXmlEntities(input).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? stripTags(match[1]) : undefined;
}

function extractAtomLink(block: string) {
  const match = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return match?.[1];
}

function readMeta(html: string, key: string) {
  const expression = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(expression)?.[1];
}

function readCanonical(html: string) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
}

function readTitle(html: string) {
  return stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function readPublishedAt(html: string) {
  return (
    readMeta(html, "article:published_time") ??
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ??
    undefined
  );
}

async function fetchArticleMetadata(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AICompanyTrackerBot/1.0 (+https://example.com)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Article fetch failed for ${url} with status ${response.status}`);
  }

  const html = await response.text();

  return {
    title: readMeta(html, "og:title") ?? readTitle(html),
    excerpt: readMeta(html, "description") ?? readMeta(html, "og:description") ?? readMeta(html, "twitter:description"),
    url: readMeta(html, "og:url") ?? readCanonical(html) ?? url,
    publishedAt: readPublishedAt(html),
  };
}

function buildRawItem(source: SourceDefinition, item: Omit<RawIngestedItem, "sourceId" | "sourceName" | "sourceUrl" | "sourceReliability" | "sourcePriority" | "fetchedAt" | "companyHint">) {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url ?? item.url,
    sourceReliability: source.reliability,
    sourcePriority: source.priority,
    fetchedAt: new Date().toISOString(),
    companyHint: source.companyHint,
    ...item,
  } satisfies RawIngestedItem;
}

function parseFeedItems(xml: string, source: SourceDefinition) {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return itemBlocks
    .map((block, index) => {
      const title = extractTag(block, "title") ?? `Untitled item ${index + 1}`;
      const link = extractTag(block, "link") ?? extractAtomLink(block) ?? source.url ?? "";
      const excerpt =
        extractTag(block, "description") ??
        extractTag(block, "summary") ??
        extractTag(block, "content") ??
        extractTag(block, "content:encoded");
      const publishedAt = extractTag(block, "pubDate") ?? extractTag(block, "published") ?? extractTag(block, "updated");

      return buildRawItem(source, {
        url: link,
        title,
        excerpt,
        rawText: excerpt,
        publishedAt,
      });
    })
    .filter((item) => passesSourceFilters(source, `${item.title} ${item.excerpt ?? ""} ${item.url}`, item.url))
    .slice(0, source.maxItems ?? 20);
}

async function parseSitemapItems(xml: string, source: SourceDefinition) {
  const urlBlocks = xml.match(/<url[\s\S]*?<\/url>/gi) ?? [];
  const sitemapUrls = urlBlocks
    .map((block) => ({
      url: extractTag(block, "loc"),
      publishedAt: extractTag(block, "lastmod"),
    }))
    .filter((entry) => Boolean(entry.url))
    .map((entry) => ({
      url: entry.url as string,
      publishedAt: entry.publishedAt,
    }))
    .filter((entry) => !source.itemUrlPrefixes || source.itemUrlPrefixes.some((prefix) => entry.url.startsWith(prefix)))
    .slice(0, (source.maxItems ?? 20) * 2);

  const hydrated = await Promise.all(
    sitemapUrls.map(async (entry) => {
      try {
        const metadata = await fetchArticleMetadata(entry.url);
        const item = buildRawItem(source, {
          url: metadata.url,
          title: metadata.title || entry.url,
          excerpt: metadata.excerpt,
          rawText: metadata.excerpt,
          publishedAt: metadata.publishedAt ?? entry.publishedAt,
        });

        return passesSourceFilters(source, `${item.title} ${item.excerpt ?? ""} ${item.url}`, item.url) ? item : null;
      } catch {
        return null;
      }
    }),
  );

  return hydrated.filter(Boolean).slice(0, source.maxItems ?? 20) as RawIngestedItem[];
}

export async function ingest(source: SourceDefinition): Promise<RawIngestedItem[]> {
  if (!source.url) {
    return [];
  }

  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "AICompanyTrackerBot/1.0 (+https://example.com)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${source.id} with status ${response.status}`);
  }

  const xml = await response.text();
  const feedItems = parseFeedItems(xml, source);

  if (feedItems.length > 0) {
    return feedItems;
  }

  if (/<urlset[\s>]/i.test(xml)) {
    return parseSitemapItems(xml, source);
  }

  return [];
}
