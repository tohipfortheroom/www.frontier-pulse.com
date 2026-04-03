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
  return normalizeSearchInput(query);
}

export function matchesSearchQuery(text: string, query: string) {
  const normalizedQuery = normalizeSearchInput(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = text.toLowerCase();
  const clauses: Array<{ include: string[]; exclude: string[] }> = [{ include: [], exclude: [] }];

  tokenizeSearchQuery(normalizedQuery).forEach((token) => {
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
