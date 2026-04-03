import type { RawIngestedItem, SourceDefinition } from "@/lib/ingestion/types";

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
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return itemBlocks.slice(0, 20).map((block, index) => {
    const title = extractTag(block, "title") ?? `Untitled item ${index + 1}`;
    const link = extractTag(block, "link") ?? extractAtomLink(block) ?? source.url!;
    const excerpt =
      extractTag(block, "description") ??
      extractTag(block, "summary") ??
      extractTag(block, "content") ??
      extractTag(block, "content:encoded");
    const publishedAt = extractTag(block, "pubDate") ?? extractTag(block, "published") ?? extractTag(block, "updated");

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url!,
      url: link,
      title,
      excerpt,
      rawText: excerpt,
      publishedAt,
      fetchedAt: new Date().toISOString(),
      companyHint: source.companyHint,
    };
  });
}
