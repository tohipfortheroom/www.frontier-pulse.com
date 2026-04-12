"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Clock } from "lucide-react";

import type { NewsItem, TimelineEntry } from "@/lib/seed/data";
import { cn } from "@/lib/utils";

type TimelineCompany = { slug: string; name: string; color: string };

type TimelinePageClientProps = {
  entries: TimelineEntry[];
  newsItems: NewsItem[];
  companies: TimelineCompany[];
};

type DayGroup = {
  date: string;
  dateLabel: string;
  events: Array<{
    entry: TimelineEntry;
    company: TimelineCompany | undefined;
    matchingNews: NewsItem | undefined;
  }>;
};

function findMatchingNews(entry: TimelineEntry, newsItems: NewsItem[]): NewsItem | undefined {
  const headlineLower = entry.headline.toLowerCase();

  return newsItems.find((item) => {
    if (!item.companySlugs.includes(entry.companySlug)) {
      return false;
    }

    const itemHeadlineLower = item.headline.toLowerCase();
    const words = headlineLower.split(/\s+/).filter((word) => word.length > 4);
    const matchCount = words.filter((word) => itemHeadlineLower.includes(word)).length;

    return matchCount >= Math.max(2, Math.floor(words.length * 0.4));
  });
}

export function TimelinePageClient({ entries, newsItems, companies }: TimelinePageClientProps) {
  const allSlugs = useMemo(() => new Set(companies.map((c) => c.slug)), [companies]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(() => new Set(allSlugs));

  const companyMap = useMemo(() => {
    const map = new Map<string, TimelineCompany>();
    companies.forEach((c) => map.set(c.slug, c));
    return map;
  }, [companies]);

  function toggleCompany(slug: string) {
    setSelectedCompanies((previous) => {
      const next = new Set(previous);

      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }

      return next;
    });
  }

  function selectAll() {
    setSelectedCompanies(new Set(allSlugs));
  }

  function selectNone() {
    setSelectedCompanies(new Set());
  }

  const dayGroups = useMemo((): DayGroup[] => {
    const filtered = entries.filter((entry) => selectedCompanies.has(entry.companySlug));

    const grouped = new Map<string, DayGroup>();

    for (const entry of filtered) {
      const dateKey = format(new Date(entry.timestamp), "yyyy-MM-dd");

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: dateKey,
          dateLabel: format(new Date(entry.timestamp), "EEEE, MMMM d"),
          events: [],
        });
      }

      grouped.get(dateKey)!.events.push({
        entry,
        company: companyMap.get(entry.companySlug),
        matchingNews: findMatchingNews(entry, newsItems),
      });
    }

    for (const group of grouped.values()) {
      group.events.sort(
        (a, b) => new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime(),
      );
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, group]) => group);
  }, [entries, newsItems, selectedCompanies, companyMap]);

  const allSelected = selectedCompanies.size === allSlugs.size;
  const noneSelected = selectedCompanies.size === 0;

  return (
    <div className="space-y-6">
      {/* Company filter chips */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            Filter by company
          </span>
          <button
            type="button"
            onClick={allSelected ? selectNone : selectAll}
            className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--accent-blue)] transition-colors hover:text-[var(--text-primary)]"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {companies.map((company) => {
            const active = selectedCompanies.has(company.slug);

            return (
              <button
                key={company.slug}
                type="button"
                onClick={() => toggleCompany(company.slug)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200",
                  active
                    ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-opacity",
                    active ? "opacity-100" : "opacity-40",
                  )}
                  style={{ backgroundColor: company.color }}
                />
                {company.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {noneSelected ? (
        <div className="surface-card rounded-3xl border border-[var(--border)] p-12 text-center backdrop-blur-sm">
          <p className="text-sm text-[var(--text-secondary)]">
            Select at least one company to see timeline events.
          </p>
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="surface-card rounded-3xl border border-[var(--border)] p-12 text-center backdrop-blur-sm">
          <p className="text-sm text-[var(--text-secondary)]">
            No timeline events found for the selected companies.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <div key={group.date} className="relative">
              {/* Sticky date header */}
              <div className="surface-elevated sticky top-16 z-10 rounded-xl border border-[var(--border)] px-4 py-2 font-[family-name:var(--font-mono)] text-sm">
                <span className="text-[var(--text-primary)]">{group.dateLabel}</span>
                <span className="ml-2 text-[var(--text-tertiary)]">
                  {group.events.length} event{group.events.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Events for this day */}
              <div className="relative mt-4 pl-6">
                {/* Vertical connector line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-[var(--border)]" />

                <div className="space-y-4">
                  {group.events.map((event) => {
                    const impactDirection = event.matchingNews?.impactDirection;
                    const audit = event.entry.audit;
                    const linkedSlug = audit?.newsSlug ?? event.matchingNews?.slug;
                    const relationLabel =
                      event.entry.relationType === "secondary"
                        ? "Secondary company"
                        : event.entry.relationType === "shared"
                          ? "Shared event"
                          : "Primary company";

                    return (
                      <div key={event.entry.slug} className="relative ml-8">
                        {/* Dot on the timeline */}
                        <span
                          className="absolute -left-[calc(2rem+6px)] top-4 h-3 w-3 rounded-full border-2 border-[var(--bg-primary)]"
                          style={{
                            backgroundColor: event.company?.color ?? "var(--text-tertiary)",
                          }}
                        />

                        {/* Event card */}
                        <div className="surface-card rounded-2xl border border-[var(--border)] p-4 backdrop-blur-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            {/* Headline */}
                            <div className="min-w-0 flex-1">
                              {linkedSlug ? (
                                <Link
                                  href={`/news/${linkedSlug}`}
                                  className="text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--text-primary)]"
                                >
                                  {event.entry.headline}
                                </Link>
                              ) : (
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                  {event.entry.headline}
                                </p>
                              )}

                              {event.entry.detail ? (
                                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                                  {event.entry.detail}
                                </p>
                              ) : null}
                            </div>

                            {/* Timestamp */}
                            <div className="flex shrink-0 items-center gap-1 text-xs text-[var(--text-tertiary)]">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(event.entry.timestamp), "HH:mm")}</span>
                            </div>
                          </div>

                          {/* Badges row */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {/* Company badge */}
                            {event.company ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: event.company.color }}
                                />
                                {event.company.name}
                              </span>
                            ) : null}

                            {/* Momentum impact badge */}
                            {impactDirection && impactDirection !== "neutral" ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  impactDirection === "positive"
                                    ? "bg-[var(--accent-green-soft)] text-[var(--accent-green)]"
                                    : "bg-[var(--accent-red-soft)] text-[var(--accent-red)]",
                                )}
                              >
                                {impactDirection === "positive" ? "+" : "-"} Momentum
                              </span>
                            ) : null}

                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                              {relationLabel}
                            </span>

                            {audit?.assignedCompanies && audit.assignedCompanies.length > 1 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-amber-border)] bg-[var(--accent-amber-soft)] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[var(--accent-amber)]">
                                {audit.assignedCompanies.length} companies linked
                              </span>
                            ) : null}

                            {audit?.sourceTierLabel ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                                {audit.sourceTierLabel}
                              </span>
                            ) : null}

                            {/* Live badge */}
                            {event.entry.live ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-green)]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                                Live
                              </span>
                            ) : null}
                          </div>

                          {audit ? (
                            <details className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                              <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                                Audit trail
                              </summary>
                              <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
                                {audit.sourceName ? <p>Source: {audit.sourceName}</p> : null}
                                {audit.categorySlugs?.length ? <p>Category: {audit.categorySlugs.join(", ")}</p> : null}
                                {audit.assignedCompanies?.length ? <p>Assigned companies: {audit.assignedCompanies.join(", ")}</p> : null}
                                {audit.confidenceLabel ? (
                                  <p>
                                    Confidence: {audit.confidenceLabel}
                                    {typeof audit.confidenceScore === "number" ? ` (${audit.confidenceScore}/10)` : ""}
                                  </p>
                                ) : null}
                                {typeof audit.scoreContribution === "number" ? <p>Score contribution: {audit.scoreContribution.toFixed(2)}</p> : null}
                                {typeof audit.decayAdjustedContribution === "number" ? <p>Decay-adjusted contribution: {audit.decayAdjustedContribution.toFixed(2)}</p> : null}
                                {audit.companyAssignmentReason ? <p>{audit.companyAssignmentReason}</p> : null}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
