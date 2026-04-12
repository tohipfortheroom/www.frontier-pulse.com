"use client";

import Link from "next/link";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { HeatmapData, HeatmapCell } from "@/lib/db/types";

type TooltipState = {
  cell: HeatmapCell;
  x: number;
  y: number;
} | null;

function getCellStyle(netScore: number, eventCount: number): React.CSSProperties {
  if (eventCount === 0) {
    return { backgroundColor: "var(--surface-soft)" };
  }

  if (netScore > 0) {
    const intensity = Math.min(1, 0.3 + (netScore / 20) * 0.7);
    return {
      backgroundColor: `var(--accent-green)`,
      opacity: intensity,
    };
  }

  if (netScore < 0) {
    const intensity = Math.min(1, 0.3 + (Math.abs(netScore) / 20) * 0.7);
    return {
      backgroundColor: `var(--accent-red)`,
      opacity: intensity,
    };
  }

  return { backgroundColor: "var(--surface-soft)" };
}

function formatDayLabel(dateStr: string): string {
  const day = dateStr.slice(8, 10);
  return String(Number(day));
}

export function IndustryHeatmap({ data }: { data: HeatmapData }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const latestActiveCells = data.cells
    .filter((cell) => cell.eventCount > 0)
    .sort((left, right) => right.date.localeCompare(left.date) || right.eventCount - left.eventCount)
    .slice(0, 8);

  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of data.cells) {
      map.set(`${cell.companySlug}::${cell.date}`, cell);
    }
    return map;
  }, [data.cells]);

  const industryTotals = useMemo(() => {
    const totals = new Map<string, { eventCount: number; netScore: number }>();
    for (const date of data.dates) {
      let eventCount = 0;
      let netScore = 0;
      for (const company of data.companies) {
        const cell = cellMap.get(`${company.slug}::${date}`);
        if (cell) {
          eventCount += cell.eventCount;
          netScore += cell.netScore;
        }
      }
      totals.set(date, { eventCount, netScore });
    }
    return totals;
  }, [data.dates, data.companies, cellMap]);

  const openTooltip = useCallback((cell: HeatmapCell, rect: DOMRect) => {
    if (cell.eventCount === 0) {
      setTooltip(null);
      return;
    }

    setTooltip({
      cell,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const openCenteredTooltip = useCallback((cell: HeatmapCell) => {
    openTooltip(
      cell,
      {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      } as DOMRect,
    );
  }, [openTooltip]);

  const handleCellInteraction = useCallback(
    (cell: HeatmapCell, event: { currentTarget: HTMLButtonElement }) => {
      if (cell.eventCount === 0) {
        setTooltip(null);
        return;
      }

      openTooltip(cell, event.currentTarget.getBoundingClientRect());
    },
    [openTooltip],
  );

  const handleTotalInteraction = useCallback(
    (date: string, event: { currentTarget: HTMLButtonElement }) => {
      const total = industryTotals.get(date);
      if (!total || total.eventCount === 0) {
        setTooltip(null);
        return;
      }

      const allEvents: HeatmapCell["events"] = [];
      for (const company of data.companies) {
        const cell = cellMap.get(`${company.slug}::${date}`);
        if (cell) {
          allEvents.push(...cell.events);
        }
      }

      openTooltip(
        {
          companySlug: "industry-total",
          companyName: "All companies",
          companyColor: "var(--accent-blue)",
          date,
          eventCount: total.eventCount,
          netScore: total.netScore,
          events: allEvents,
        },
        event.currentTarget.getBoundingClientRect(),
      );
    },
    [industryTotals, data.companies, cellMap, openTooltip],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        gridRef.current &&
        !gridRef.current.contains(event.target as Node)
      ) {
        setTooltip(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const columnCount = data.dates.length;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          Green = positive score accumulation
        </span>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          Red = negative score pressure
        </span>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          Number = event count for that day
        </span>
      </div>

      {/* Scrollable grid container */}
      <div
        ref={gridRef}
        className="scrollbar-none mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] backdrop-blur-sm"
        style={{ background: "var(--surface-card)" }}
      >
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `160px repeat(${columnCount}, 32px)`,
            gap: "2px",
          }}
          role="grid"
          aria-label="Industry activity heatmap for the last 30 days"
        >
          {/* Header row: blank corner + date labels */}
          <div
            className="sticky left-0 z-20 flex items-end px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]"
            style={{ background: "var(--surface-card)" }}
            role="columnheader"
          >
            Company
          </div>
          {data.dates.map((date) => (
            <div
              key={date}
              className="flex items-end justify-center pb-2 font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-tertiary)]"
              role="columnheader"
              title={date}
            >
              {formatDayLabel(date)}
            </div>
          ))}

          {/* Company rows */}
          {data.companies.map((company) => (
            <div key={company.slug} className="contents" role="row">
              {/* Sticky company name column */}
              <div
                className="sticky left-0 z-20 flex items-center gap-2 px-3 py-1 text-sm font-medium text-[var(--text-primary)]"
                style={{ background: "var(--surface-card)" }}
                role="rowheader"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: company.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{company.name}</span>
              </div>

              {data.dates.map((date) => {
                const cell = cellMap.get(`${company.slug}::${date}`);
                if (!cell) return null;

                return (
                  <button
                    key={date}
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-sm transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)]"
                    style={getCellStyle(cell.netScore, cell.eventCount)}
                    onClick={(e) => handleCellInteraction(cell, e)}
                    onMouseEnter={(event) => handleCellInteraction(cell, event)}
                    onFocus={(event) => handleCellInteraction(cell, event)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTooltip(cell, event.currentTarget.getBoundingClientRect());
                      }
                      if (event.key === "Escape") {
                        setTooltip(null);
                      }
                    }}
                    role="gridcell"
                    aria-label={`${company.name}, ${date}: ${cell.eventCount} events, net score ${cell.netScore >= 0 ? "+" : ""}${cell.netScore}`}
                    tabIndex={0}
                  >
                    {cell.eventCount > 0 && (
                      <span className="font-[family-name:var(--font-mono)] text-[9px] font-bold text-[var(--text-inverse)]">
                        {cell.eventCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Industry totals row */}
          <div className="contents" role="row">
            <div
              className="sticky left-0 z-20 flex items-center px-3 py-1 text-sm font-semibold text-[var(--text-secondary)]"
              style={{
                background: "var(--surface-card)",
                borderTop: "1px solid var(--border)",
              }}
              role="rowheader"
            >
              Industry Total
            </div>
            {data.dates.map((date) => {
              const total = industryTotals.get(date);
              const eventCount = total?.eventCount ?? 0;
              const netScore = total?.netScore ?? 0;

              return (
                <button
                  key={date}
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-sm transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)]"
                  style={{
                    ...getCellStyle(netScore, eventCount),
                    borderTop: "1px solid var(--border)",
                  }}
                  onClick={(e) => handleTotalInteraction(date, e)}
                  onMouseEnter={(event) => handleTotalInteraction(date, event)}
                  onFocus={(event) => handleTotalInteraction(date, event)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      const total = industryTotals.get(date);
                      if (!total || total.eventCount === 0) {
                        setTooltip(null);
                        return;
                      }

                      const allEvents: HeatmapCell["events"] = [];
                      for (const company of data.companies) {
                        const cell = cellMap.get(`${company.slug}::${date}`);
                        if (cell) {
                          allEvents.push(...cell.events);
                        }
                      }

                      openTooltip(
                        {
                          companySlug: "industry-total",
                          companyName: "All companies",
                          companyColor: "var(--accent-blue)",
                          date,
                          eventCount: total.eventCount,
                          netScore: total.netScore,
                          events: allEvents,
                        },
                        event.currentTarget.getBoundingClientRect(),
                      );
                    }
                    if (event.key === "Escape") {
                      setTooltip(null);
                    }
                  }}
                  role="gridcell"
                  aria-label={`Industry total, ${date}: ${eventCount} events, net score ${netScore >= 0 ? "+" : ""}${netScore}`}
                  tabIndex={0}
                >
                  {eventCount > 0 && (
                    <span className="font-[family-name:var(--font-mono)] text-[9px] font-bold text-[var(--text-inverse)]">
                      {eventCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] p-4 md:hidden">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          Recent active cells
        </p>
        {latestActiveCells.length > 0 ? (
          <div className="mt-3 space-y-2">
            {latestActiveCells.map((cell) => (
              <button
                key={`${cell.companySlug}-${cell.date}`}
                type="button"
                onClick={() => openCenteredTooltip(cell)}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-left"
              >
                <span className="text-sm text-[var(--text-primary)]">
                  {cell.companyName} · {cell.date}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {cell.eventCount} events
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">No event cells are available for the current window.</p>
        )}
      </div>

      {/* Tooltip / popover */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-80 rounded-xl border border-[var(--border)] p-4 backdrop-blur-md"
          style={{
            background: "var(--surface-elevated)",
            boxShadow: "var(--shadow-strong)",
            left: `${Math.min(tooltip.x - 160, window.innerWidth - 340)}px`,
            top: `${tooltip.y - 12}px`,
            transform: "translateY(-100%)",
          }}
          role="dialog"
          aria-label={`Events for ${tooltip.cell.companyName} on ${tooltip.cell.date}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tooltip.cell.companySlug !== "industry-total" && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tooltip.cell.companyColor }}
                  aria-hidden="true"
                />
              )}
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {tooltip.cell.companyName}
              </span>
            </div>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-tertiary)]">
              {tooltip.cell.date}
            </span>
          </div>

          <div className="mb-2 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span>{tooltip.cell.eventCount} event{tooltip.cell.eventCount !== 1 ? "s" : ""}</span>
            <span
              className={
                tooltip.cell.netScore > 0
                  ? "font-[family-name:var(--font-mono)] text-[var(--accent-green)]"
                  : tooltip.cell.netScore < 0
                    ? "font-[family-name:var(--font-mono)] text-[var(--accent-red)]"
                    : "font-[family-name:var(--font-mono)] text-[var(--text-tertiary)]"
              }
            >
              Net: {tooltip.cell.netScore >= 0 ? "+" : ""}
              {tooltip.cell.netScore}
            </span>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto">
            {tooltip.cell.events.map((event, index) => (
              <div
                key={`${event.newsSlug ?? event.eventType}-${index}`}
                className="rounded-lg border border-[var(--border)] p-2.5"
                style={{ background: "var(--surface-soft)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {event.headline ?? event.eventType}
                  </span>
                  <span
                    className={
                      event.scoreDelta >= 0
                        ? "shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-[var(--accent-green)]"
                        : "shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-[var(--accent-red)]"
                    }
                  >
                    {event.scoreDelta >= 0 ? "+" : ""}
                    {event.scoreDelta}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {event.explanation}
                </p>
                {event.newsSlug ? (
                  <Link
                    href={`/news/${event.newsSlug}`}
                    className="mt-2 inline-flex text-[11px] text-[var(--accent-blue)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Open story
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-3 w-full rounded-lg py-1.5 text-center text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
            style={{ background: "var(--surface-soft)" }}
            onClick={() => setTooltip(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
