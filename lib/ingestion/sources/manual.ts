import type { RawIngestedItem, SourceDefinition } from "@/lib/ingestion/types";

export async function ingest(source: SourceDefinition): Promise<RawIngestedItem[]> {
  return (source.items ?? []).map((item) => ({
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url ?? item.url,
    url: item.url,
    title: item.title,
    excerpt: item.excerpt,
    rawText: item.excerpt,
    publishedAt: item.publishedAt,
    fetchedAt: new Date().toISOString(),
    companyHint: source.companyHint,
  }));
}
