"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

  const cellMap = useCallback(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of data.cells) {
      map.set(`${cell.companySlug}::${cell.date}`, cell);
    }
    return map;
  }, [data.cells])();

  const industryTotals = useCallback(() => {
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
  }, [data.dates, data.companies, cellMap])();

  const handleCellInteraction = useCallback(
    (cell: HeatmapCell, event: React.MouseEvent<HTMLButtonElement>) => {
      if (cell.eventCount === 0) {
        setTooltip(null);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        cell,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [],
  );

  const handleTotalInteraction = useCallback(
    (date: string, event: React.MouseEvent<HTMLButtonElement>) => {
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

      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        cell: {
          companySlug: "industry-total",
          companyName: "All companies",
          companyColor: "var(--accent-blue)",
          date,
          eventCount: total.eventCount,
          netScore: total.netScore,
          events: allEvents,
        },
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [industryTotals, data.companies, cellMap],
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
      {/* Scrollable grid container */}
      <div
        ref={gridRef}
        className="scrollbar-none overflow-x-auto rounded-2xl border border-[var(--border)] backdrop-blur-sm"
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
                key={`${event.eventType}-${index}`}
                className="rounded-lg border border-[var(--border)] p-2.5"
                style={{ background: "var(--surface-soft)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {event.eventType}
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
