"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ScoreBreakdownRow = {
  date: string;
  label: string;
  total: number;
  eventType: string;
  scoreDelta: number;
  explanation: string;
  headline?: string;
  newsSlug?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceTierLabel?: string;
  baseWeight?: number;
  ageDays?: number;
  decayFactor?: number;
  netContribution?: number;
  confidenceScore?: number | null;
  confidenceLabel?: string | null;
  companyAssignmentReason?: string;
};

type ChartRow = {
  date: string;
  label: string;
  details: ScoreBreakdownRow[];
  [key: string]: string | number | ScoreBreakdownRow[];
};

const EVENT_COLORS: Record<string, string> = {
  "major model release": "var(--accent-green)",
  "major product launch": "var(--accent-blue)",
  "enterprise partnership": "var(--accent-amber)",
  "funding round": "var(--accent-purple)",
  "infrastructure expansion": "var(--accent-blue)",
  "research breakthrough": "var(--accent-green)",
  "benchmark claim": "var(--accent-blue)",
  "executive change": "var(--accent-purple)",
  controversy: "var(--accent-red)",
  "failed/delayed launch": "var(--accent-red)",
  "regulatory setback": "var(--accent-red)",
};

function formatEventKey(eventType: string) {
  return eventType.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function ScoreBreakdownChart({ rows }: { rows: ScoreBreakdownRow[] }) {
  const [mounted, setMounted] = useState(false);
  const { chartRows, eventKeys, detailRows } = useMemo(() => {
    const byDate = new Map<string, ChartRow>();
    const keys = new Set<string>();
    const sortedDetails = [...rows].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    );

    rows.forEach((row) => {
      const key = formatEventKey(row.eventType);
      const existing = byDate.get(row.date) ?? {
        date: row.date,
        label: row.label,
        details: [],
      };
      existing[key] = Number(existing[key] ?? 0) + row.scoreDelta;
      (existing.details as ScoreBreakdownRow[]).push(row);
      byDate.set(row.date, existing);
      keys.add(key);
    });

    return {
      chartRows: [...byDate.values()],
      eventKeys: [...keys],
      detailRows: sortedDetails,
    };
  }, [rows]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (chartRows.length === 0) {
    return (
      <div className="surface-subtle flex h-[280px] items-center justify-center rounded-2xl border border-[var(--border)] px-6 text-sm text-[var(--text-secondary)]">
        Score breakdown will appear once event-level attribution is available.
      </div>
    );
  }

  return (
    <div className="surface-inline rounded-2xl border border-[var(--border)] p-4">
      <div className="h-[300px] w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartRows} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-soft)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const row = payload[0]?.payload as ChartRow | undefined;

                  if (!row) {
                    return null;
                  }

                  return (
                    <div className="w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-strong)]">
                      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                        {row.label}
                      </p>
                      <div className="mt-3 space-y-3">
                        {(row.details as ScoreBreakdownRow[]).map((detail) => (
                          <div key={`${detail.date}-${detail.eventType}-${detail.explanation.slice(0, 24)}`}>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {detail.eventType} {detail.scoreDelta >= 0 ? `+${detail.scoreDelta}` : detail.scoreDelta}
                            </p>
                            {detail.sourceTierLabel ? (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                                {detail.sourceTierLabel}
                                {detail.confidenceLabel ? ` · ${detail.confidenceLabel}` : ""}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{detail.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              {eventKeys.map((eventKey) => (
                <Bar
                  key={eventKey}
                  dataKey={eventKey}
                  stackId="score"
                  radius={[6, 6, 0, 0]}
                  fill={EVENT_COLORS[eventKey.replace(/-/g, " ")] ?? "var(--accent-blue)"}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="surface-subtle h-full w-full rounded-2xl border border-[var(--border)]" aria-hidden="true" />
        )}
      </div>

      <div className="mt-5 grid gap-3">
        {detailRows.map((row) => (
          <div key={`${row.date}-${row.eventType}-${row.explanation.slice(0, 20)}`} className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-[var(--text-primary)]">{row.headline ?? row.eventType}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {row.label} · {row.eventType}
                  {row.sourceName ? ` · ${row.sourceName}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-primary)]">
                  {typeof row.netContribution === "number"
                    ? `${row.netContribution >= 0 ? "+" : ""}${row.netContribution.toFixed(2)}`
                    : `${row.scoreDelta >= 0 ? "+" : ""}${row.scoreDelta.toFixed(2)}`}
                </p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Net contribution</p>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{row.explanation}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {row.sourceTierLabel ? (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {row.sourceTierLabel}
                </span>
              ) : null}
              {row.confidenceLabel ? (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  Confidence: {row.confidenceLabel}
                  {typeof row.confidenceScore === "number" ? ` (${row.confidenceScore}/10)` : ""}
                </span>
              ) : null}
              {typeof row.baseWeight === "number" ? (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  Base weight: {row.baseWeight >= 0 ? `+${row.baseWeight}` : row.baseWeight}
                </span>
              ) : null}
              {typeof row.ageDays === "number" ? (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  Age: {row.ageDays}d
                </span>
              ) : null}
              {typeof row.decayFactor === "number" ? (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  Decay: {row.decayFactor.toFixed(2)}x
                </span>
              ) : null}
            </div>

            {row.companyAssignmentReason ? (
              <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{row.companyAssignmentReason}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
