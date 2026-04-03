"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { companiesBySlug, type MomentumSnapshot } from "@/lib/seed/data";

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
    <div className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.86)] p-6 backdrop-blur-sm">
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
                  ? "rounded-full border border-[rgba(77,159,255,0.24)] bg-[rgba(77,159,255,0.12)] px-4 py-2 text-sm text-[var(--text-primary)]"
                  : "rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              }
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-[360px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  background: "rgba(18,18,26,0.96)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                }}
              />
              {rows.map((row) => (
                <Area
                  key={row.companySlug}
                  type="monotone"
                  dataKey={row.companySlug}
                  stroke={companiesBySlug[row.companySlug]?.color ?? "#4D9FFF"}
                  fill={companiesBySlug[row.companySlug]?.color ?? "#4D9FFF"}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {rows.map((row) => (
          <span key={row.companySlug} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: companiesBySlug[row.companySlug]?.color ?? "#4D9FFF" }} />
            {companiesBySlug[row.companySlug]?.name ?? row.companySlug}
          </span>
        ))}
      </div>
    </div>
  );
}
