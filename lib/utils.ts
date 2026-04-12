import { differenceInCalendarDays, differenceInHours, format, isValid } from "date-fns";

import { buildSentenceExcerpt, sanitizeEditorialText } from "@/lib/content";

export type AccentTone = "green" | "red" | "blue" | "amber" | "purple" | "neutral";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function toValidDate(value: Date | string) {
  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00`
      : value;
  const date = normalizedValue instanceof Date ? normalizedValue : new Date(normalizedValue);
  return isValid(date) ? date : null;
}

export function hasMeaningfulMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value !== 0;
}

export function hasDisplayText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function formatScore(value: number, digits = 1) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}

export function formatCompactDate(date: Date | string) {
  const parsed = toValidDate(date);
  return parsed ? format(parsed, "MMM d") : "";
}

export function formatDateLabel(date: Date | string) {
  const parsed = toValidDate(date);
  return parsed ? format(parsed, "MMM d, yyyy") : "";
}

export function formatTimestamp(date: Date | string) {
  const parsed = toValidDate(date);

  if (!parsed) {
    return "";
  }

  const now = new Date();
  const hoursAgo = differenceInHours(now, parsed);
  const daysAgo = differenceInCalendarDays(now, parsed);

  if (hoursAgo < 1) {
    return "Just now";
  }

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  if (daysAgo === 1) {
    return "Yesterday";
  }

  if (daysAgo < 7) {
    return `${daysAgo} days ago`;
  }

  return format(parsed, "MMM d, yyyy");
}

export function formatSmartTime(date: Date | string) {
  return formatTimestamp(date);
}

export function formatUpdateTimestamp(date: Date | string) {
  const parsed = toValidDate(date);

  if (!parsed) {
    return "";
  }

  const now = new Date();
  const hoursAgo = differenceInHours(now, parsed);
  const daysAgo = differenceInCalendarDays(now, parsed);

  if (hoursAgo < 1) {
    return "<1h ago";
  }

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  if (daysAgo === 1) {
    return "Yesterday";
  }

  if (daysAgo < 7) {
    return `${daysAgo} days ago`;
  }

  return format(parsed, "MMM d, yyyy");
}

export function formatLongDate(date: Date | string) {
  const parsed = toValidDate(date);
  return parsed ? format(parsed, "EEEE, MMMM d, yyyy") : "";
}

export function formatLastUpdatedLabel(date: Date | string | null | undefined) {
  if (!date) {
    return "";
  }

  const timestamp = formatUpdateTimestamp(date);
  return timestamp ? `Last updated: ${timestamp}` : "";
}

function normalizeWhitespace(value: string) {
  return sanitizeEditorialText(value).replace(/\s+/g, " ").trim();
}

const SENTENCE_ABBREVIATIONS = new Set(["no", "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc"]);

function extractSentences(value: string) {
  const sentences: string[] = [];
  let sentenceStart = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (!/[.!?]/.test(character)) {
      continue;
    }

    if (character === ".") {
      const abbreviation = value.slice(sentenceStart, index + 1).match(/([A-Za-z]+)\.$/)?.[1]?.toLowerCase();

      if (abbreviation && SENTENCE_ABBREVIATIONS.has(abbreviation)) {
        continue;
      }
    }

    let boundaryIndex = index + 1;

    while (boundaryIndex < value.length && /["')\]]/.test(value[boundaryIndex])) {
      boundaryIndex += 1;
    }

    if (boundaryIndex >= value.length) {
      const sentence = normalizeWhitespace(value.slice(sentenceStart, boundaryIndex));

      if (sentence) {
        sentences.push(sentence);
      }

      sentenceStart = boundaryIndex;
      break;
    }

    if (!/\s/.test(value[boundaryIndex])) {
      continue;
    }

    let nextTokenIndex = boundaryIndex;

    while (nextTokenIndex < value.length && /\s/.test(value[nextTokenIndex])) {
      nextTokenIndex += 1;
    }

    if (nextTokenIndex >= value.length || /[A-Z0-9(]/.test(value[nextTokenIndex])) {
      const sentence = normalizeWhitespace(value.slice(sentenceStart, boundaryIndex));

      if (sentence) {
        sentences.push(sentence);
      }

      sentenceStart = nextTokenIndex;
    }
  }

  return sentences;
}

export function toCompleteSentence(value: string | null | undefined) {
  const input = sanitizeEditorialText(value);

  if (!hasDisplayText(input)) {
    return "";
  }

  const normalized = normalizeWhitespace(input.trim().replace(/(?:\s*\.\.\.+)+$/, ""));

  if (!normalized) {
    return "";
  }

  if (/[.!?]["')\]]*$/.test(normalized)) {
    return normalized;
  }

  const sentences = extractSentences(normalized);

  if (sentences.length > 0) {
    return sentences.join(" ");
  }

  const excerpt = buildSentenceExcerpt(normalized, { maxChars: 420, maxSentences: 2 });
  return excerpt || `${normalized.replace(/[,:;\-–—]+$/, "").trim()}.`;
}

export function cleanNarrativeText(value: string | null | undefined) {
  const input = sanitizeEditorialText(value);

  if (!hasDisplayText(input)) {
    return "";
  }

  const paragraphs = input
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean)
    .map((paragraph) => {
      const sentences = extractSentences(paragraph);
      const sourceSentences = sentences.length > 0 ? sentences : [toCompleteSentence(paragraph)];
      const seen = new Set<string>();

      return sourceSentences
        .map((sentence) => normalizeWhitespace(sentence))
        .filter(Boolean)
        .filter((sentence) => {
          const key = sentence.toLowerCase();

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
        .join(" ");
    })
    .filter(Boolean);

  return paragraphs.join("\n\n");
}

export function getImportanceLabel(score: number) {
  if (score >= 8) {
    return "Critical";
  }

  if (score >= 5) {
    return "Notable";
  }

  return "Standard";
}

export function getConfidenceLabel(score: number) {
  if (score >= 8) {
    return "High";
  }

  if (score >= 5) {
    return "Medium";
  }

  return "Developing";
}

export function getChangeTone(value: number): AccentTone {
  if (value > 0) {
    return "green";
  }

  if (value < 0) {
    return "red";
  }

  return "neutral";
}

export function accentClasses(tone: AccentTone) {
  const tones: Record<
    AccentTone,
    {
      bg: string;
      border: string;
      text: string;
      softText: string;
      glow: string;
      ring: string;
    }
  > = {
    green: {
      bg: "bg-[var(--accent-green-soft)]",
      border: "border-[var(--accent-green-border)]",
      text: "text-[var(--accent-green)]",
      softText: "text-[var(--accent-green)]",
      glow: "shadow-[0_0_26px_var(--accent-green-glow)]",
      ring: "ring-[var(--accent-green-ring)]",
    },
    red: {
      bg: "bg-[var(--accent-red-soft)]",
      border: "border-[var(--accent-red-border)]",
      text: "text-[var(--accent-red)]",
      softText: "text-[var(--accent-red)]",
      glow: "shadow-[0_0_26px_var(--accent-red-glow)]",
      ring: "ring-[var(--accent-red-ring)]",
    },
    blue: {
      bg: "bg-[var(--accent-blue-soft)]",
      border: "border-[var(--accent-blue-border)]",
      text: "text-[var(--accent-blue)]",
      softText: "text-[var(--accent-blue)]",
      glow: "shadow-[0_0_26px_var(--accent-blue-glow)]",
      ring: "ring-[var(--accent-blue-ring)]",
    },
    amber: {
      bg: "bg-[var(--accent-amber-soft)]",
      border: "border-[var(--accent-amber-border)]",
      text: "text-[var(--accent-amber)]",
      softText: "text-[var(--accent-amber)]",
      glow: "shadow-[0_0_26px_var(--accent-amber-glow)]",
      ring: "ring-[var(--accent-amber-ring)]",
    },
    purple: {
      bg: "bg-[var(--accent-purple-soft)]",
      border: "border-[var(--accent-purple-border)]",
      text: "text-[var(--accent-purple)]",
      softText: "text-[var(--accent-purple)]",
      glow: "shadow-[0_0_26px_var(--accent-purple-glow)]",
      ring: "ring-[var(--accent-purple-ring)]",
    },
    neutral: {
      bg: "bg-[var(--surface-soft)]",
      border: "border-[var(--border)]",
      text: "text-[var(--text-secondary)]",
      softText: "text-[var(--text-secondary)]",
      glow: "shadow-[var(--shadow-soft)]",
      ring: "ring-[var(--border-hover)]",
    },
  };

  return tones[tone];
}
