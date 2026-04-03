"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, Newspaper, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { SearchResponse } from "@/lib/search/types";

type FlatResult =
  | (SearchResponse["companies"][number] & { type: "company" })
  | (SearchResponse["news"][number] & { type: "news" });

const emptyResults: SearchResponse = {
  companies: [],
  news: [],
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const flatResults = useMemo<FlatResult[]>(
    () => [
      ...results.companies.map((item) => ({ ...item, type: "company" as const })),
      ...results.news.map((item) => ({ ...item, type: "news" as const })),
    ],
    [results],
  );

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
    if (!open || !query.trim()) {
      setResults(emptyResults);
      setActiveIndex(0);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const payload = (await response.json()) as SearchResponse;
        setResults(payload);
        setActiveIndex(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults(emptyResults);
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  function closeModal() {
    setOpen(false);
    setQuery("");
    setResults(emptyResults);
    setActiveIndex(0);
  }

  function navigateToResult(result: FlatResult) {
    router.push(result.href);
    closeModal();
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:border-[rgba(77,159,255,0.2)] hover:text-[var(--text-primary)]"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden rounded-full border border-[rgba(255,255,255,0.06)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)] sm:inline-flex">
          Cmd/Ctrl K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-[rgba(10,10,15,0.72)] px-4 py-10 backdrop-blur-md" onClick={closeModal}>
          <div
            className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[var(--border)] bg-[rgba(18,18,26,0.96)] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
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
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                Esc
              </span>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {!query.trim() ? (
                <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5">
                  <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                    Search the race
                  </p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Use quoted phrases and operators to tighten the read. Example: <span className="text-[var(--text-primary)]">"GPT-5" OR Claude -rumor</span>
                  </p>
                </div>
              ) : isLoading ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5 text-sm text-[var(--text-secondary)]">
                  Searching the latest company and news context...
                </div>
              ) : flatResults.length > 0 ? (
                <div className="space-y-5">
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
                              ? "border-[rgba(77,159,255,0.24)] bg-[rgba(77,159,255,0.08)]"
                              : "border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-hover)]",
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
                            <p className="text-sm leading-6 text-[var(--text-secondary)]">{result.description}</p>
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
                                ? "border-[rgba(255,184,77,0.26)] bg-[rgba(255,184,77,0.08)]"
                                : "border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-hover)]",
                            )}
                          >
                            <Newspaper className="mt-0.5 h-4 w-4 text-[var(--accent-amber)]" />
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--text-primary)]">{result.headline}</p>
                              <p className="text-sm leading-6 text-[var(--text-secondary)]">{result.summary}</p>
                              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                                {result.sourceName} · {format(new Date(result.publishedAt), "MMM d, h:mm a")}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5 text-sm text-[var(--text-secondary)]">
                  No results matched that search. Try a broader company name, model family, or quoted phrase.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
