import type { LaunchCardData, NewsItem } from "@/lib/seed/data";

import { getContentDateKey } from "@/lib/surface-data";
import { isLaunchSurfaceStory, isPrestigeSurfaceStory } from "@/lib/story-quality";
import { toCompleteSentence } from "@/lib/utils";

export function selectTodayInAiStories(news: NewsItem[], now = new Date(), limit = 5) {
  const nowMs = now.getTime();
  const eligibleStories = news.filter((item) => isPrestigeSurfaceStory(item));
  const rankedStories = eligibleStories
    .slice()
    .sort(
      (left, right) =>
        right.importanceScore - left.importanceScore ||
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );

  const last24Hours = rankedStories.filter((item) => {
    const publishedAtMs = new Date(item.publishedAt).getTime();
    return Number.isFinite(publishedAtMs) && publishedAtMs <= nowMs && nowMs - publishedAtMs <= 24 * 60 * 60 * 1000;
  });

  if (last24Hours.length > 0) {
    return last24Hours.slice(0, limit);
  }

  const latestStoryByTime = eligibleStories
    .slice()
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())[0];
  const latestDateKey = getContentDateKey(latestStoryByTime?.publishedAt);

  if (!latestDateKey) {
    return [];
  }

  return rankedStories
    .filter((item) => getContentDateKey(item.publishedAt) === latestDateKey)
    .slice(0, limit);
}

function inferLaunchType(item: NewsItem): LaunchCardData["type"] {
  if (item.categorySlugs.includes("model-release")) {
    return "MODEL";
  }

  if (/api\b/i.test(item.headline)) {
    return "API";
  }

  if (/(platform|infrastructure|stack|cloud)/i.test(item.headline)) {
    return "PLATFORM";
  }

  return "PRODUCT";
}

function accentForLaunchType(type: LaunchCardData["type"]): LaunchCardData["accent"] {
  switch (type) {
    case "MODEL":
      return "green";
    case "API":
      return "blue";
    case "PLATFORM":
      return "amber";
    case "PRODUCT":
    default:
      return "purple";
  }
}

export function buildNewsLaunchCards(news: NewsItem[], limit = 6): LaunchCardData[] {
  const relevantStories = news
    .filter((item) => Boolean(item.companySlugs[0]) && isLaunchSurfaceStory(item))
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime() ||
        right.importanceScore - left.importanceScore,
    );

  return relevantStories.slice(0, limit).map<LaunchCardData>((item) => {
    const type = inferLaunchType(item);

    return {
      slug: item.slug,
      type,
      name: item.headline,
      companySlug: item.companySlugs[0],
      description: toCompleteSentence(item.shortSummary || item.summary || item.whyItMatters || item.headline),
      launchDate: item.publishedAt,
      accent: accentForLaunchType(type),
    };
  });
}
