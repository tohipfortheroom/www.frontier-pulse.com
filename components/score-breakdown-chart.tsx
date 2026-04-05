"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ScoreBreakdownRow = {
  date: string;
  label: string;
  total: number;
  eventType: string;
  scoreDelta: number;
  explanation: string;
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
  const { chartRows, eventKeys } = useMemo(() => {
    const byDate = new Map<string, ChartRow>();
    const keys = new Set<string>();

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
    };
  }, [rows]);

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
        <ResponsiveContainer width="100%" height="100%">
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
      </div>
    </div>
  );
}
