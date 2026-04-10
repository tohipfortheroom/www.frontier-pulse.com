"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/db/browser-client";
import { companiesBySlug, type MomentumSnapshot } from "@/lib/seed/data";
import { cn, formatScore, hasMeaningfulMetric, toCompleteSentence } from "@/lib/utils";

import { ScorePill } from "@/components/score-pill";
import { TrendSparkline } from "@/components/trend-sparkline";

type LeaderboardTableProps = {
  rows: MomentumSnapshot[];
  mode?: "preview" | "full";
  footerHref?: string;
  footerLabel?: string;
  realtime?: boolean;
};

export function LeaderboardTable({
  rows,
  mode = "preview",
  footerHref,
  footerLabel,
  realtime = false,
}: LeaderboardTableProps) {
  const router = useRouter();
  const sortedRows = useMemo(
    () => [...rows].filter((row) => hasMeaningfulMetric(row.score)).sort((left, right) => left.rank - right.rank),
    [rows],
  );
  const visibleRows = useMemo(() => (mode === "preview" ? sortedRows.slice(0, 10) : sortedRows), [mode, sortedRows]);
  const previousScores = useRef<Record<string, number>>({});
  const [flashingRows, setFlashingRows] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const changed = visibleRows
      .filter((row) => previousScores.current[row.companySlug] !== undefined && previousScores.current[row.companySlug] !== row.score)
      .map((row) => row.companySlug);

    previousScores.current = Object.fromEntries(visibleRows.map((row) => [row.companySlug, row.score]));

    if (changed.length > 0) {
      setFlashingRows(changed);
      const timeout = window.setTimeout(() => setFlashingRows([]), 650);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [visibleRows]);

  useEffect(() => {
    if (!realtime) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("momentum-scores-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "momentum_scores" }, () => {
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = window.setTimeout(() => {
          router.refresh();
        }, 250);
      })
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [realtime, router]);

  if (visibleRows.length === 0) {
    return (
      <div className="surface-card rounded-2xl border border-[var(--border)] p-5 text-sm text-[var(--text-secondary)] backdrop-blur-sm">
        Leaderboard data is updating.
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl border border-[var(--border)] backdrop-blur-sm">
      <div className="hidden lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Momentum Score</th>
              {mode === "full" ? <th className="px-5 py-4">24h Change</th> : null}
              {mode === "full" ? <th className="px-5 py-4">7d Change</th> : <th className="px-5 py-4">7-Day Trend</th>}
              {mode === "full" ? <th className="px-5 py-4">Sparkline</th> : null}
              <th className="px-5 py-4">Key Driver</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const company = companiesBySlug[row.companySlug];
              const sparklineColor = row.scoreChange7d >= 0 ? "var(--accent-green)" : "var(--accent-red)";

              return (
                <tr
                  key={row.companySlug}
                  tabIndex={mode === "preview" ? 0 : -1}
                  role={mode === "preview" ? "link" : undefined}
                  aria-label={mode === "preview" ? `Open ${company.name}` : undefined}
                  onMouseEnter={() => mode === "preview" && setHoveredRow(row.companySlug)}
                  onMouseLeave={() => mode === "preview" && setHoveredRow(null)}
                  onFocus={() => mode === "preview" && setHoveredRow(row.companySlug)}
                  onBlur={() => mode === "preview" && setHoveredRow(null)}
                  onClick={() => mode === "preview" && router.push(`/companies/${row.companySlug}`)}
                  onKeyDown={(event) => {
                    if (mode !== "preview") {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/companies/${row.companySlug}`);
                    }
                  }}
                  style={{ "--row-accent": company.color } as CSSProperties}
                  className={cn(
                    "group/row border-b border-[var(--border)] transition-all duration-200",
                    index % 2 === 0 ? "bg-[var(--surface-subtle)]" : "bg-[var(--surface-card-strong)]",
                    mode === "preview"
                      ? "cursor-pointer hover:bg-[var(--bg-card-hover)] hover:shadow-[inset_3px_0_0_var(--row-accent)] focus-visible:bg-[var(--bg-card-hover)] focus-visible:shadow-[inset_3px_0_0_var(--row-accent)]"
                      : "hover:bg-[var(--bg-card-hover)]",
                  )}
                >
                  <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-sm text-[var(--text-tertiary)]">
                    {row.rank.toString().padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: company.color }} />
                      <span className="font-medium text-[var(--text-primary)]">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        row.score >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]",
                        flashingRows.includes(row.companySlug) &&
                          (row.scoreChange24h >= 0 ? "rounded-md bg-[var(--accent-green-soft)] px-2 py-1" : "rounded-md bg-[var(--accent-red-soft)] px-2 py-1"),
                      )}
                    >
                      {formatScore(row.score)}
                    </span>
                  </td>
                  {mode === "full" ? (
                    <td className="px-5 py-4">
                      <ScorePill value={row.scoreChange24h} compact />
                    </td>
                  ) : null}
                  <td className="px-5 py-4">
                    {mode === "full" ? (
                      <ScorePill value={row.scoreChange7d} compact />
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-primary)]">
                          {row.trend}
                        </span>
                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-300",
                            hoveredRow === row.companySlug ? "w-[74px] opacity-100" : "w-0 opacity-0",
                          )}
                        >
                          <TrendSparkline data={row.sparkline} color={sparklineColor} height={24} />
                        </div>
                      </div>
                    )}
                  </td>
                  {mode === "full" ? (
                    <td className="px-5 py-4">
                      <div className="h-10 w-28">
                        <TrendSparkline data={row.sparkline} color={sparklineColor} height={40} />
                      </div>
                    </td>
                  ) : null}
                  <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{toCompleteSentence(row.keyDriver)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-4 lg:hidden">
        {visibleRows.map((row) => {
          const company = companiesBySlug[row.companySlug];
          const sparklineColor = row.scoreChange7d >= 0 ? "var(--accent-green)" : "var(--accent-red)";

          return (
            <div
              key={row.companySlug}
              onClick={() => mode === "preview" && router.push(`/companies/${row.companySlug}`)}
              onKeyDown={(event) => {
                if (mode !== "preview") {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/companies/${row.companySlug}`);
                }
              }}
              tabIndex={mode === "preview" ? 0 : -1}
              role={mode === "preview" ? "link" : undefined}
              className={cn(
                "surface-inline rounded-xl border border-[var(--border)] p-4 transition-all duration-200",
                mode === "preview" && "cursor-pointer hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-soft)]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-tertiary)]">
                      #{row.rank}
                    </span>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: company.color }} />
                    <span className="font-medium text-[var(--text-primary)]">{company.name}</span>
                  </div>
                  <p className="hidden text-sm text-[var(--text-secondary)] sm:block">{toCompleteSentence(row.keyDriver)}</p>
                </div>
                <ScorePill value={row.score} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                {mode === "full" ? (
                  <>
                    <ScorePill value={row.scoreChange24h} compact />
                    <div className="hidden sm:block">
                      <ScorePill value={row.scoreChange7d} compact />
                    </div>
                    <div className="w-16 sm:w-24">
                      <TrendSparkline data={row.sparkline} color={sparklineColor} height={28} />
                    </div>
                  </>
                ) : (
                  <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-primary)]">{row.trend}</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-tertiary)] sm:hidden">{toCompleteSentence(row.keyDriver)}</span>
                <Link href={`/companies/${row.companySlug}`} className="ml-auto text-xs font-medium text-[var(--accent-blue)]">
                  Full details →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {footerHref && footerLabel ? (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <Link href={footerHref} className="text-sm font-medium text-[var(--accent-blue)]">
            {footerLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
