"use client";

import { differenceInDays, format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { companiesBySlug, type TimelineEntry } from "@/lib/seed/data";
import { cn, formatTimestamp, toCompleteSentence } from "@/lib/utils";

function inferTone(headline: string) {
  const normalized = headline.toLowerCase();

  if (/(fund|raise|financing|valuation)/i.test(normalized)) {
    return "var(--accent-green)";
  }

  if (/(partner|agreement|deal)/i.test(normalized)) {
    return "var(--accent-blue)";
  }

  if (/(policy|regulation|export|act)/i.test(normalized)) {
    return "var(--accent-red)";
  }

  if (/(model|llama|grok|gemini|gpt|claude|release|launch)/i.test(normalized)) {
    return "var(--accent-purple)";
  }

  return "var(--accent-amber)";
}

export function InteractiveTimeline({ entries }: { entries: TimelineEntry[] }) {
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const [selectedSlug, setSelectedSlug] = useState(entries[entries.length - 1]?.slug ?? entries[0]?.slug ?? "");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const filteredEntries = useMemo(() => {
    const latest = new Date(
      [...entries]
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0]?.timestamp ??
        new Date().toISOString(),
    );

    return [...entries]
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .filter((entry) => differenceInDays(latest, new Date(entry.timestamp)) <= range);
  }, [entries, range]);

  const selectedEntry = filteredEntries.find((entry) => entry.slug === selectedSlug) ?? filteredEntries[filteredEntries.length - 1];

  useEffect(() => {
    const element = scrollerRef.current;

    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, [range, filteredEntries.length]);

  useEffect(() => {
    if (selectedEntry) {
      setSelectedSlug(selectedEntry.slug);
    }
  }, [selectedEntry?.slug]);

  return (
    <div className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
            Interactive Timeline
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Zoom in on the latest seven days or pull back to see the broader rhythm of the race.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value as 7 | 30 | 90)}
              className={
                value === range
                  ? "rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-4 py-2 text-sm text-[var(--text-primary)]"
                  : "surface-soft rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              }
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollerRef} className="scrollbar-none mt-8 overflow-x-auto">
        <div className="flex min-w-max items-center gap-10 px-2 pb-3">
          {filteredEntries.map((entry, index) => {
            const company = companiesBySlug[entry.companySlug];
            const tone = inferTone(entry.headline);

            return (
              <div key={entry.slug} className="relative flex min-w-[220px] flex-col items-center text-center">
                {index < filteredEntries.length - 1 ? (
                  <div
                    className="absolute left-[calc(50%+1rem)] top-4 h-px w-[calc(100%+1.5rem)]"
                    style={{ background: "linear-gradient(90deg, var(--accent-blue-border), var(--surface-soft))" }}
                  />
                ) : null}
                <button type="button" onClick={() => setSelectedSlug(entry.slug)} className="space-y-3">
                  <div
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] transition-transform duration-200 hover:scale-110",
                      selectedSlug === entry.slug && "ring-2 ring-[var(--accent-blue-ring)]",
                    )}
                    style={{ backgroundColor: tone, boxShadow: entry.live ? `0 0 20px ${tone}` : `0 0 12px ${tone}` }}
                  >
                    {entry.live ? <span className="h-2 w-2 rounded-full bg-white animate-[pulse_2s_infinite]" /> : null}
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                    <p className="mt-2 line-clamp-2 max-w-[220px] text-sm font-semibold text-[var(--text-primary)]">
                      {entry.headline}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{company.name}</p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedEntry ? (
        <div className="surface-soft mt-8 rounded-2xl border border-[var(--border)] p-5">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {formatTimestamp(selectedEntry.timestamp)}
          </p>
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
            {selectedEntry.headline}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{toCompleteSentence(selectedEntry.detail)}</p>
        </div>
      ) : null}
    </div>
  );
}
