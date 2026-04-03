"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { companiesBySlug, type MomentumSnapshot } from "@/lib/seed/data";
import { cn, formatScore } from "@/lib/utils";

import { ScorePill } from "@/components/score-pill";
import { TrendSparkline } from "@/components/trend-sparkline";

type LeaderboardTableProps = {
  rows: MomentumSnapshot[];
  mode?: "preview" | "full";
  footerHref?: string;
  footerLabel?: string;
};

export function LeaderboardTable({
  rows,
  mode = "preview",
  footerHref,
  footerLabel,
}: LeaderboardTableProps) {
  const sortedRows = [...rows].sort((left, right) => left.rank - right.rank);
  const previousScores = useRef<Record<string, number>>({});
  const [flashingRows, setFlashingRows] = useState<string[]>([]);

  useEffect(() => {
    const changed = sortedRows
      .filter((row) => previousScores.current[row.companySlug] !== undefined && previousScores.current[row.companySlug] !== row.score)
      .map((row) => row.companySlug);

    previousScores.current = Object.fromEntries(sortedRows.map((row) => [row.companySlug, row.score]));

    if (changed.length > 0) {
      setFlashingRows(changed);
      const timeout = window.setTimeout(() => setFlashingRows([]), 650);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [rows, sortedRows]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] backdrop-blur-sm">
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
            {sortedRows.map((row, index) => {
              const company = companiesBySlug[row.companySlug];
              const sparklineColor = row.scoreChange7d >= 0 ? "var(--accent-green)" : "var(--accent-red)";

              return (
                <tr
                  key={row.companySlug}
                  className={
                    index % 2 === 0
                      ? "border-b border-[var(--border)] bg-[rgba(10,10,15,0.3)] transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
                      : "border-b border-[var(--border)] bg-[rgba(18,18,26,0.92)] transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
                  }
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
                          (row.scoreChange24h >= 0 ? "rounded-md bg-[rgba(0,230,138,0.08)] px-2 py-1" : "rounded-md bg-[rgba(255,77,106,0.08)] px-2 py-1"),
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
                      <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-primary)]">
                        {row.trend}
                      </span>
                    )}
                  </td>
                  {mode === "full" ? (
                    <td className="px-5 py-4">
                      <div className="h-10 w-28">
                        <TrendSparkline data={row.sparkline} color={sparklineColor} height={40} />
                      </div>
                    </td>
                  ) : null}
                  <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{row.keyDriver}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-4 lg:hidden">
        {sortedRows.map((row) => {
          const company = companiesBySlug[row.companySlug];
          const sparklineColor = row.scoreChange7d >= 0 ? "var(--accent-green)" : "var(--accent-red)";

          return (
            <div
              key={row.companySlug}
              className="rounded-xl border border-[var(--border)] bg-[rgba(10,10,15,0.48)] p-4"
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
                  <p className="text-sm text-[var(--text-secondary)]">{row.keyDriver}</p>
                </div>
                <ScorePill value={row.score} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                {mode === "full" ? (
                  <>
                    <ScorePill value={row.scoreChange24h} compact />
                    <ScorePill value={row.scoreChange7d} compact />
                    <div className="w-24">
                      <TrendSparkline data={row.sparkline} color={sparklineColor} height={32} />
                    </div>
                  </>
                ) : (
                  <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-primary)]">{row.trend}</span>
                )}
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
