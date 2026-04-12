"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Clock, HelpCircle, Newspaper, Search, Sparkles, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { fetchJsonWithRetry } from "@/lib/network/fetch";
import { cn, formatTimestamp, toCompleteSentence } from "@/lib/utils";
import type { SearchResponse, SearchSuggestion } from "@/lib/search/types";

type FlatResult =
  | (SearchResponse["companies"][number] & { type: "company" })
  | (SearchResponse["news"][number] & { type: "news" });

const emptyResults: SearchResponse = {
  companies: [],
  news: [],
};

const RECENT_SEARCHES_KEY = "fp-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? (JSON.parse(stored) as string[]).slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // localStorage unavailable
  }
}

const SYNTAX_HINTS = [
  { syntax: '"exact phrase"', description: "Match an exact phrase" },
  { syntax: "term1 term2", description: "AND — both terms must match" },
  { syntax: "term1 OR term2", description: "Either term matches" },
  { syntax: "-excluded", description: "Exclude a term" },
  { syntax: "after:2026-03-01", description: "Published after date" },
  { syntax: "before:2026-04-01", description: "Published before date" },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const hasAlertedRef = useRef(false);
  const { pushToast } = useToast();
  const isOnline = useNetworkStatus();

  const suggestions = results.suggestions ?? [];

  const flatResults = useMemo<FlatResult[]>(
    () => [
      ...results.companies.map((item) => ({ ...item, type: "company" as const })),
      ...results.news.map((item) => ({ ...item, type: "news" as const })),
    ],
    [results],
  );

  // Load recent searches when modal opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim() || !isOnline) {
      setResults(emptyResults);
      setActiveIndex(0);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const payload = await fetchJsonWithRetry<SearchResponse>(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
          timeoutMs: 10_000,
          retries: 1,
        });
        setResults(payload);
        setActiveIndex(0);
        hasAlertedRef.current = false;
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults(emptyResults);

          if (!hasAlertedRef.current) {
            pushToast({
              tone: "error",
              title: "Search unavailable",
              description: error instanceof Error ? error.message : "Unable to search right now.",
            });
            hasAlertedRef.current = true;
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query, isOnline, pushToast]);

  function closeModal() {
    setOpen(false);
    setQuery("");
    setResults(emptyResults);
    setActiveIndex(0);
    setShowSyntaxHelp(false);
  }

  function navigateToResult(result: FlatResult) {
    saveRecentSearch(query.trim());
    router.push(result.href);
    closeModal();
  }

  function applySuggestion(suggestion: SearchSuggestion | string) {
    const newQuery = typeof suggestion === "string" ? suggestion : suggestion.query;
    setQuery(newQuery);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (flatResults.length === 0 ? 0 : (index + 1) % flatResults.length));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (flatResults.length === 0 ? 0 : (index - 1 + flatResults.length) % flatResults.length));
    }

    if (event.key === "Enter" && flatResults[activeIndex]) {
      event.preventDefault();
      navigateToResult(flatResults[activeIndex]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }
  }

  const showEmptyState = !query.trim();
  const hasResults = flatResults.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="surface-soft inline-flex items-center gap-3 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--accent-blue-border)] hover:text-[var(--text-primary)]"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
        <span className="hidden rounded-full border border-[var(--border)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)] sm:inline-flex">
          Cmd/Ctrl K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] surface-overlay px-4 py-10 backdrop-blur-md" onClick={closeModal}>
          <div
            className="surface-card-strong panel-shadow-strong mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[var(--border)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
              <Search className="h-5 w-5 text-[var(--text-tertiary)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Search news and companies. Try "GPT-5" OR Claude'
                className="h-12 w-full bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="button"
                onClick={() => setShowSyntaxHelp((v) => !v)}
                className={cn(
                  "rounded-full p-1.5 transition-colors duration-200",
                  showSyntaxHelp
                    ? "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                )}
                title="Search syntax help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                Esc
              </span>
            </div>

            {/* Syntax help panel */}
            {showSyntaxHelp ? (
              <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-blue)]">
                    Search Syntax
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSyntaxHelp(false)}
                    className="rounded-full p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SYNTAX_HINTS.map((hint) => (
                    <div
                      key={hint.syntax}
                      className="flex items-baseline gap-3 text-sm"
                    >
                      <code className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs text-[var(--text-primary)]">
                        {hint.syntax}
                      </code>
                      <span className="text-[var(--text-tertiary)]">{hint.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {showEmptyState ? (
                <div className="space-y-5">
                  <div className="surface-subtle space-y-4 rounded-3xl border border-[var(--border)] p-5">
                    <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                      Search the race
                    </p>
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">
                      Use quoted phrases and operators to tighten the read. Example:{" "}
                      <span className="text-[var(--text-primary)]">&quot;GPT-5&quot; OR Claude -rumor</span>
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Supports <code className="rounded border border-[var(--border)] px-1 py-0.5 font-[family-name:var(--font-mono)] text-[10px]">before:</code> and{" "}
                      <code className="rounded border border-[var(--border)] px-1 py-0.5 font-[family-name:var(--font-mono)] text-[10px]">after:</code> date operators.{" "}
                      <button
                        type="button"
                        onClick={() => setShowSyntaxHelp(true)}
                        className="text-[var(--accent-blue)] hover:underline"
                      >
                        View all syntax →
                      </button>
                    </p>
                  </div>

                  {/* Recent searches */}
                  {recentSearches.length > 0 ? (
                    <div className="space-y-2">
                      <p className="px-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        Recent Searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((recent) => (
                          <button
                            key={recent}
                            type="button"
                            onClick={() => applySuggestion(recent)}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                          >
                            <Clock className="h-3 w-3" />
                            <span>{recent}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : !isOnline ? (
                <div className="rounded-3xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] p-5 text-sm text-[var(--accent-red)]">
                  Search is unavailable while you&apos;re offline.
                </div>
              ) : isLoading ? (
                <div className="surface-subtle rounded-3xl border border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">
                  Searching the latest company and news context...
                </div>
              ) : hasResults ? (
                <div className="space-y-5">
                  {/* Inline suggestions */}
                  {suggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="px-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        Suggestions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.type}-${suggestion.label}`}
                            type="button"
                            onClick={() => applySuggestion(suggestion)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                          >
                            {suggestion.type === "company" ? <Building2 className="h-3 w-3" /> : null}
                            {suggestion.type === "category" ? <Sparkles className="h-3 w-3" /> : null}
                            {suggestion.type === "tag" ? <Tag className="h-3 w-3" /> : null}
                            <span>{suggestion.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {results.companies.length > 0 ? (
                    <div className="space-y-2">
                      <p className="px-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-blue)]">
                        Companies
                      </p>
                      {results.companies.map((result, index) => (
                        <button
                          key={result.slug}
                          type="button"
                          onClick={() => navigateToResult({ ...result, type: "company" })}
                          onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                              "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-150",
                              activeIndex === index
                                ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)]"
                                : "border-[var(--border)] bg-[var(--surface-subtle)] hover:border-[var(--border-hover)]",
                            )}
                          >
                          <Building2 className="mt-0.5 h-4 w-4 text-[var(--accent-blue)]" />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[var(--text-primary)]">{result.name}</span>
                              {result.momentumLabel ? (
                                <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                                  {result.momentumLabel}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(result.description)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {results.news.length > 0 ? (
                    <div className="space-y-2">
                      <p className="px-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-amber)]">
                        News
                      </p>
                      {results.news.map((result, index) => {
                        const absoluteIndex = results.companies.length + index;

                        return (
                          <button
                            key={result.slug}
                            type="button"
                            onClick={() => navigateToResult({ ...result, type: "news" })}
                            onMouseEnter={() => setActiveIndex(absoluteIndex)}
                            className={cn(
                              "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-150",
                              activeIndex === absoluteIndex
                                ? "border-[var(--accent-amber-border)] bg-[var(--accent-amber-soft)]"
                                : "border-[var(--border)] bg-[var(--surface-subtle)] hover:border-[var(--border-hover)]",
                            )}
                          >
                            <Newspaper className="mt-0.5 h-4 w-4 text-[var(--accent-amber)]" />
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--text-primary)]">{result.headline}</p>
                              <p className="text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(result.summary)}</p>
                              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                                {result.sourceName} · {formatTimestamp(result.publishedAt)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="surface-subtle rounded-3xl border border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">
                    No results matched that search. Try a broader company name, model family, or quoted phrase.
                  </div>

                  {/* Show suggestions even on empty results */}
                  {suggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="px-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        Did you mean?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.type}-${suggestion.label}`}
                            type="button"
                            onClick={() => applySuggestion(suggestion)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                          >
                            {suggestion.type === "company" ? <Building2 className="h-3 w-3" /> : null}
                            {suggestion.type === "category" ? <Sparkles className="h-3 w-3" /> : null}
                            {suggestion.type === "tag" ? <Tag className="h-3 w-3" /> : null}
                            <span>{suggestion.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
