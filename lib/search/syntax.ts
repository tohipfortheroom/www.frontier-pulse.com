function tokenizeSearchQuery(query: string) {
  return query.match(/-?"[^"]+"|-?\S+/g) ?? [];
}

function normalizeToken(token: string) {
  return token.replace(/^"/, "").replace(/"$/, "").trim().toLowerCase();
}

export function normalizeSearchInput(query: string) {
  return query.replace(/\|/g, " OR ").replace(/\s+/g, " ").trim();
}

export function toWebSearchQuery(query: string) {
  // Strip date operators before sending to Supabase full-text search
  return stripDateOperators(normalizeSearchInput(query));
}

/** Remove before: and after: tokens so the remaining text can be used for full-text search. */
function stripDateOperators(query: string) {
  return query.replace(/\b(?:before|after):\S+/gi, "").replace(/\s+/g, " ").trim();
}

/** Parse date operator values (YYYY-MM-DD) from the query string. */
export type DateFilters = {
  before?: Date;
  after?: Date;
};

export function extractDateFilters(query: string): DateFilters {
  const normalized = normalizeSearchInput(query);
  const filters: DateFilters = {};

  const beforeMatch = normalized.match(/\bbefore:(\d{4}-\d{2}-\d{2})\b/i);
  if (beforeMatch) {
    const parsed = new Date(beforeMatch[1] + "T23:59:59Z");
    if (!Number.isNaN(parsed.getTime())) {
      filters.before = parsed;
    }
  }

  const afterMatch = normalized.match(/\bafter:(\d{4}-\d{2}-\d{2})\b/i);
  if (afterMatch) {
    const parsed = new Date(afterMatch[1] + "T00:00:00Z");
    if (!Number.isNaN(parsed.getTime())) {
      filters.after = parsed;
    }
  }

  return filters;
}

/** Get the text portion of a query with date operators removed. */
export function getTextQuery(query: string): string {
  return stripDateOperators(normalizeSearchInput(query));
}

export function matchesSearchQuery(text: string, query: string, publishedAt?: string) {
  const normalizedQuery = normalizeSearchInput(query);

  if (!normalizedQuery) {
    return true;
  }

  // Check date filters first
  if (publishedAt) {
    const dateFilters = extractDateFilters(normalizedQuery);
    const pubDate = new Date(publishedAt);

    if (dateFilters.before && pubDate > dateFilters.before) {
      return false;
    }

    if (dateFilters.after && pubDate < dateFilters.after) {
      return false;
    }
  }

  // Strip date operators from the text matching portion
  const textQuery = stripDateOperators(normalizedQuery);

  if (!textQuery) {
    // Query was only date operators and they passed
    return true;
  }

  const haystack = text.toLowerCase();
  const clauses: Array<{ include: string[]; exclude: string[] }> = [{ include: [], exclude: [] }];

  tokenizeSearchQuery(textQuery).forEach((token) => {
    if (/^or$/i.test(token)) {
      clauses.push({ include: [], exclude: [] });
      return;
    }

    const negative = token.startsWith("-");
    const normalizedToken = normalizeToken(negative ? token.slice(1) : token);

    if (!normalizedToken) {
      return;
    }

    const currentClause = clauses.at(-1);

    if (!currentClause) {
      return;
    }

    if (negative) {
      currentClause.exclude.push(normalizedToken);
      return;
    }

    currentClause.include.push(normalizedToken);
  });

  return clauses
    .filter((clause) => clause.include.length > 0 || clause.exclude.length > 0)
    .some((clause) => {
      const includes = clause.include.every((term) => haystack.includes(term));
      const excludes = clause.exclude.every((term) => !haystack.includes(term));

      return includes && excludes;
    });
}
