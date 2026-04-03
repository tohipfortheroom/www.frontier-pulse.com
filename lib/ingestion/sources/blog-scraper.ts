import type { RawIngestedItem, SourceDefinition } from "@/lib/ingestion/types";

function readMeta(html: string, key: string) {
  const expression = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(expression)?.[1];
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
    throw new Error(`Blog fetch failed for ${source.id} with status ${response.status}`);
  }

  const html = await response.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? source.name;
  const excerpt = readMeta(html, "description") ?? readMeta(html, "og:description") ?? readMeta(html, "twitter:description");
  const canonicalUrl = readMeta(html, "og:url") ?? source.url;
  const publishedAt = readMeta(html, "article:published_time");

  return [
    {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      url: canonicalUrl,
      title,
      excerpt,
      rawText: excerpt,
      publishedAt,
      fetchedAt: new Date().toISOString(),
      companyHint: source.companyHint,
    },
  ];
}
