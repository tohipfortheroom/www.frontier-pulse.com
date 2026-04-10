const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const DIGEST_GLITCH_PATTERNS = [
  /\bThe app was ranking No\.(?:\s|$)/i,
  /\barXiv:/i,
  /\bLaunch HN:/i,
  /\bcross Abstract:/i,
];
const GENERIC_WHY_IT_MATTERS_PATTERNS = [
  /policy stories matter because compliance friction can slow adoption even when model quality keeps improving/i,
  /commercial partnerships matter because they convert technical progress into distribution, customers, and revenue signal/i,
  /this matters because it changes how the market reads current momentum, execution quality, or adoption potential/i,
  /this matters because it changes how the market reads/i,
  /changes how the market reads current momentum/i,
  /execution quality/i,
  /adoption potential/i,
  /compliance friction can slow adoption/i,
  /distribution, customers, and revenue signal/i,
];
const SENTENCE_ABBREVIATIONS = new Set(["no", "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc"]);

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

function trimToWordBoundary(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  const clipped = value.slice(0, maxChars);
  const boundary = clipped.search(/\s\S*$/);
  const trimmed = boundary > maxChars * 0.6 ? clipped.slice(0, boundary) : clipped;

  return trimmed.replace(/[,:;\-–—\s]+$/, "").trim();
}

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
      const sentence = value.slice(sentenceStart, boundaryIndex).trim();

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
      const sentence = value.slice(sentenceStart, boundaryIndex).trim();

      if (sentence) {
        sentences.push(sentence);
      }

      sentenceStart = nextTokenIndex;
    }
  }

  return sentences;
}

function normalizeComparableText(value: string | null | undefined) {
  return sanitizeEditorialText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (match, decimal) => {
      const numeric = Number.parseInt(decimal, 10);

      if (numeric === 60 || numeric === 62) {
        return match;
      }

      return toCodePoint(decimal, 10) ?? match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const numeric = Number.parseInt(hex, 16);

      if (numeric === 60 || numeric === 62) {
        return match;
      }

      return toCodePoint(hex, 16) ?? match;
    })
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match);
}

export function normalizeEditorialWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\bT\s+he\b/g, "The")
    .replace(/\bt\s+he\b/g, "the")
    .replace(/\bT\s+his\b/g, "This")
    .replace(/\bt\s+his\b/g, "this")
    .replace(/\bT\s+hat\b/g, "That")
    .replace(/\bt\s+hat\b/g, "that")
    .replace(/\bT\s+hese\b/g, "These")
    .replace(/\bt\s+hese\b/g, "these")
    .replace(/\bT\s+here\b/g, "There")
    .replace(/\bt\s+here\b/g, "there")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeEditorialText(value: string | null | undefined) {
  const input = typeof value === "string" ? value : "";

  if (!input.trim()) {
    return "";
  }

  return normalizeEditorialWhitespace(decodeHtmlEntities(input).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""));
}

export function isHeadlineRestatement(headline: string | null | undefined, text: string | null | undefined) {
  const normalizedHeadline = normalizeComparableText(headline);
  const normalizedText = normalizeComparableText(text);

  if (!normalizedHeadline || !normalizedText) {
    return false;
  }

  return normalizedText === normalizedHeadline || (normalizedText.startsWith(normalizedHeadline) && normalizedText.length - normalizedHeadline.length < 24);
}

export function isGenericWhyItMatters(value: string | null | undefined) {
  const cleaned = sanitizeEditorialText(value);

  if (!cleaned) {
    return false;
  }

  return GENERIC_WHY_IT_MATTERS_PATTERNS.some((pattern) => pattern.test(cleaned));
}

export function buildSentenceExcerpt(
  value: string | null | undefined,
  { maxChars = 420, maxSentences = 2 }: { maxChars?: number; maxSentences?: number } = {},
) {
  const cleaned = sanitizeEditorialText(value);

  if (!cleaned) {
    return "";
  }

  const sentences = extractSentences(cleaned);

  if (sentences.length === 0) {
    const trimmed = trimToWordBoundary(cleaned, maxChars);
    return trimmed ? `${trimmed}.` : "";
  }

  const selected: string[] = [];

  for (const sentence of sentences) {
    const nextValue = [...selected, sentence].join(" ");

    if (selected.length > 0 && nextValue.length > maxChars) {
      break;
    }

    selected.push(sentence);

    if (selected.length >= maxSentences) {
      break;
    }
  }

  return selected.join(" ");
}

export function looksLikeTruncatedText(value: string | null | undefined, fallbackText?: string | null | undefined) {
  const cleaned = sanitizeEditorialText(value);

  if (!cleaned) {
    return true;
  }

  if (/\bNo\.$/.test(cleaned)) {
    return true;
  }

  if (!/[.!?]["')\]]*$/.test(cleaned)) {
    return true;
  }

  const fallback = sanitizeEditorialText(fallbackText);

  if (fallback && fallback.length - cleaned.length > 16 && fallback.startsWith(cleaned)) {
    return true;
  }

  return false;
}

export function looksLikeCorruptedDigestText(value: string | null | undefined) {
  const cleaned = sanitizeEditorialText(value);

  if (!cleaned) {
    return true;
  }

  if (DIGEST_GLITCH_PATTERNS.some((pattern) => pattern.test(cleaned))) {
    return true;
  }

  return cleaned.length < 40 || looksLikeTruncatedText(cleaned);
}

export function isHighSignalDigestText(value: string | null | undefined) {
  const cleaned = sanitizeEditorialText(value);

  if (!cleaned || looksLikeCorruptedDigestText(cleaned)) {
    return false;
  }

  return cleaned.length >= 90 || extractSentences(cleaned).length >= 2;
}

export function selectBestSummary({
  summary,
  fallbackText,
  headline,
  maxChars = 420,
  maxSentences = 2,
}: {
  summary?: string | null;
  fallbackText?: string | null;
  headline: string;
  maxChars?: number;
  maxSentences?: number;
}) {
  const fallback = sanitizeEditorialText(fallbackText);
  const preferred = looksLikeTruncatedText(summary, fallback) ? fallback || summary || headline : summary || fallback || headline;
  return buildSentenceExcerpt(preferred, { maxChars, maxSentences });
}

export function selectBestShortSummary({
  shortSummary,
  summary,
  fallbackText,
  headline,
}: {
  shortSummary?: string | null;
  summary?: string | null;
  fallbackText?: string | null;
  headline: string;
}) {
  const cleanedFallback = sanitizeEditorialText(fallbackText);
  const cleanedSummary = sanitizeEditorialText(summary);
  const summaryFallback = looksLikeTruncatedText(cleanedSummary, cleanedFallback)
    ? cleanedFallback || cleanedSummary
    : cleanedSummary || cleanedFallback;
  const preferred = looksLikeTruncatedText(shortSummary, summaryFallback)
    ? summaryFallback || shortSummary || headline
    : shortSummary || summaryFallback || headline;
  return buildSentenceExcerpt(preferred, { maxChars: 160, maxSentences: 1 });
}

export function selectBestWhyItMatters({
  whyItMatters,
  headline,
  summary,
  shortSummary,
}: {
  whyItMatters?: string | null;
  headline: string;
  summary?: string | null;
  shortSummary?: string | null;
}) {
  const cleaned = buildSentenceExcerpt(whyItMatters, { maxChars: 220, maxSentences: 1 });

  if (!cleaned || isGenericWhyItMatters(cleaned) || isHeadlineRestatement(headline, cleaned)) {
    return "";
  }

  const normalized = normalizeComparableText(cleaned);

  if (!normalized) {
    return "";
  }

  if (normalized === normalizeComparableText(summary) || normalized === normalizeComparableText(shortSummary)) {
    return "";
  }

  return cleaned;
}

export function hasUsableExpandedSummary({
  summary,
  shortSummary,
  headline,
  minimumChars = 80,
}: {
  summary?: string | null;
  shortSummary?: string | null;
  headline: string;
  minimumChars?: number;
}) {
  const cleaned = sanitizeEditorialText(summary);

  if (!cleaned || cleaned.length < minimumChars || looksLikeTruncatedText(cleaned)) {
    return false;
  }

  const normalized = normalizeComparableText(cleaned);

  if (!normalized) {
    return false;
  }

  return (
    normalized !== normalizeComparableText(shortSummary) &&
    normalized !== normalizeComparableText(headline) &&
    !isHeadlineRestatement(headline, cleaned)
  );
}
