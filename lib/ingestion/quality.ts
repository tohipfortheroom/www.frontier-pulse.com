import { differenceInMinutes, differenceInHours } from "date-fns";

import { STORY_QUALITY_CONFIG, getSourceMaxAgeHours } from "./config.ts";
import type { SourceDefinition } from "./types.ts";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function canonicalizeUrl(value: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const removableParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "fbclid",
      "gclid",
      "igshid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
      "source",
      "s",
    ];

    removableParams.forEach((param) => {
      url.searchParams.delete(param);
    });

    const sortedParams = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });

    url.search = "";

    sortedParams.forEach(([key, valueParam]) => {
      url.searchParams.append(key, valueParam);
    });

    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return value.trim();
  }
}

export function buildTitleFingerprint(title: string) {
  return normalizeWhitespace(
    title
      .toLowerCase()
      .replace(/[|:]\s+(frontier pulse|openai|anthropic|google|microsoft|meta|nvidia|mistral|reddit|hacker news).*$/i, "")
      .replace(/[^a-z0-9]+/g, " "),
  );
}

export function normalizePublishedAt(value: string | undefined, fetchedAt: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function classifyStoryAge(publishedAt: string, source: SourceDefinition, referenceDate = new Date(), maxAgeOverrideHours?: number) {
  const publishedDate = new Date(publishedAt);

  if (Number.isNaN(publishedDate.getTime())) {
    return "invalid";
  }

  if (differenceInMinutes(publishedDate, referenceDate) > STORY_QUALITY_CONFIG.maxFutureSkewMinutes) {
    return "future";
  }

  const maxAge = maxAgeOverrideHours ?? getSourceMaxAgeHours(source);

  if (differenceInHours(referenceDate, publishedDate) > maxAge) {
    return "too-old";
  }

  return "accepted";
}
