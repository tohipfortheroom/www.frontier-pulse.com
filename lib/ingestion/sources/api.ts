import { matchesAnyKeyword, trackedAiKeywords } from "../keywords.ts";
import { fetchSourceJson } from "../server-fetch.ts";
import type { RawIngestedItem, SourceDefinition } from "../types.ts";

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRawItem(
  source: SourceDefinition,
  item: Omit<RawIngestedItem, "sourceId" | "sourceName" | "sourceUrl" | "sourceReliability" | "sourcePriority" | "fetchedAt" | "companyHint">,
  sourceName = source.name,
) {
  return {
    sourceId: source.id,
    sourceName,
    sourceUrl: source.url ?? item.url,
    sourceReliability: source.reliability,
    sourcePriority: source.priority,
    fetchedAt: new Date().toISOString(),
    companyHint: source.companyHint,
    ...item,
  } satisfies RawIngestedItem;
}

function getFilterKeywords(source: SourceDefinition) {
  return source.includeKeywords && source.includeKeywords.length > 0 ? source.includeKeywords : trackedAiKeywords;
}

async function ingestHackerNews(source: SourceDefinition) {
  const api = source.api;

  if (!source.url || !api || api.provider !== "hacker-news") {
    return [];
  }

  const payload = await fetchSourceJson<{
    hits?: Array<{
      author?: string;
      created_at?: string;
      objectID?: string;
      story_text?: string | null;
      title?: string | null;
      url?: string | null;
    }>;
  }>(source.url, {
    source,
    label: `API source ${source.id}`,
  });
  const keywords = getFilterKeywords(source);

  return (payload.hits ?? [])
    .filter((hit) => {
      const text = `${hit.title ?? ""} ${hit.story_text ?? ""}`.trim();
      return Boolean(hit.title) && matchesAnyKeyword(text, keywords);
    })
    .slice(0, source.maxItems ?? 20)
    .map((hit) =>
      buildRawItem(source, {
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        title: hit.title ?? "Untitled Hacker News story",
        excerpt: hit.story_text ?? undefined,
        rawText: hit.story_text ?? undefined,
        publishedAt: hit.created_at,
      }),
    );
}

async function ingestReddit(source: SourceDefinition) {
  const api = source.api;

  if (!api || api.provider !== "reddit") {
    return [];
  }

  const keywords = getFilterKeywords(source);
  const collected: RawIngestedItem[] = [];

  for (const [index, subreddit] of api.subreddits.entries()) {
    if (index > 0) {
      await delay(2000);
    }

    const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${api.timeframe ?? "day"}&limit=${api.limit ?? 20}`;
    const payload = await fetchSourceJson<{
      data?: {
        children?: Array<{
          data?: {
            created_utc?: number;
            permalink?: string;
            selftext?: string;
            title?: string;
          };
        }>;
      };
    }>(url, {
      source,
      label: `Reddit source r/${subreddit}`,
    });

    const subredditItems = (payload.data?.children ?? [])
      .map((child) => child.data)
      .filter((post): post is NonNullable<typeof post> => Boolean(post?.title))
      .filter((post) => matchesAnyKeyword(`${post.title} ${post.selftext ?? ""}`, keywords))
      .map((post) =>
        buildRawItem(
          source,
          {
            url: `https://www.reddit.com${post.permalink ?? ""}`,
            title: post.title ?? "Untitled Reddit post",
            excerpt: post.selftext ?? undefined,
            rawText: post.selftext ?? undefined,
            publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
          },
          `Reddit r/${subreddit}`,
        ),
      );

    collected.push(...subredditItems);
  }

  return collected.slice(0, source.maxItems ?? 20);
}

export async function ingest(source: SourceDefinition): Promise<RawIngestedItem[]> {
  switch (source.api?.provider) {
    case "hacker-news":
      return ingestHackerNews(source);
    case "reddit":
      return ingestReddit(source);
    default:
      return [];
  }
}
