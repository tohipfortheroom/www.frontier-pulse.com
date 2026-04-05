"use client";

import { useEffect, useMemo, useState } from "react";
import type { TooltipContentProps } from "recharts";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { companiesBySlug, type MomentumSnapshot } from "@/lib/seed/data";
import { formatScore } from "@/lib/utils";

function expandSeries(values: number[], targetLength: number) {
  if (values.length >= targetLength) {
    return values.slice(values.length - targetLength);
  }

  return Array.from({ length: targetLength }, (_, index) => {
    const ratio = targetLength === 1 ? 0 : index / (targetLength - 1);
    const sourceIndex = ratio * (values.length - 1);
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(values.length - 1, Math.ceil(sourceIndex));
    const lower = values[lowerIndex] ?? values[0] ?? 0;
    const upper = values[upperIndex] ?? values[values.length - 1] ?? lower;
    const mix = sourceIndex - lowerIndex;
    return Number((lower + (upper - lower) * mix).toFixed(2));
  });
}

function MomentumTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rows = [...payload]
    .filter((entry) => typeof entry.value === "number" && !!entry.dataKey)
    .sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0));

  return (
    <div className="surface-card-strong min-w-[180px] rounded-2xl border border-[var(--border)] p-4 shadow-[var(--shadow-soft)]">
      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {label} window
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((entry) => {
          const companySlug = String(entry.dataKey);
          const company = companiesBySlug[companySlug];

          return (
            <div key={companySlug} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: company?.color ?? "var(--accent-blue)" }} />
                <span>{company?.name ?? companySlug}</span>
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                {formatScore(Number(entry.value ?? 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MomentumHistoryChart({ rows }: { rows: MomentumSnapshot[] }) {
  const [range, setRange] = useState<7 | 30>(30);
  const [mounted, setMounted] = useState(false);
  const series = useMemo(() => {
    return Array.from({ length: range }, (_, index) => {
      const point = { day: `${range - index}d` } as Record<string, string | number>;

      rows.forEach((row) => {
        point[row.companySlug] = expandSeries(row.sparkline, range)[index];
      });

      return point;
    });
  }, [range, rows]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="surface-card rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
            Momentum History
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Overlay the board across a short or extended window to see who is sustaining momentum versus spiking briefly.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value as 7 | 30)}
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

      <div className="mt-6 min-w-0">
        {mounted ? (
          <ResponsiveContainer width="100%" height={360} minWidth={0}>
            <AreaChart data={series}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--text-tertiary)"
                tickLine={false}
                axisLine={false}
                minTickGap={range === 30 ? 18 : 10}
                tickMargin={10}
                interval={range === 30 ? 2 : 0}
              />
              <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={44} tickMargin={10} />
              <Tooltip content={(props) => <MomentumTooltip {...props} />} cursor={{ stroke: "var(--border-hover)", strokeDasharray: "3 3" }} />
              {rows.map((row) => (
                <Area
                  key={row.companySlug}
                  type="monotone"
                  dataKey={row.companySlug}
                  stroke={companiesBySlug[row.companySlug]?.color ?? "var(--accent-blue)"}
                  fill={companiesBySlug[row.companySlug]?.color ?? "var(--accent-blue)"}
                  fillOpacity={0.04}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="surface-subtle h-full w-full rounded-3xl border border-[var(--border)]" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {rows.map((row) => (
          <span key={row.companySlug} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: companiesBySlug[row.companySlug]?.color ?? "var(--accent-blue)" }} />
            {companiesBySlug[row.companySlug]?.name ?? row.companySlug}
          </span>
        ))}
      </div>
    </div>
  );
}
