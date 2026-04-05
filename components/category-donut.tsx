"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const donutColors = [
  "var(--accent-blue)",
  "var(--accent-green)",
  "var(--accent-amber)",
  "var(--accent-purple)",
  "var(--accent-red)",
  "var(--accent-green)",
  "var(--accent-blue)",
  "var(--accent-amber)",
];

export function CategoryDonut({
  data,
}: {
  data: Array<{
    slug: string;
    name: string;
    count: number;
  }>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-[260px] w-full">
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.slug} fill={donutColors[index % donutColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="surface-subtle h-full w-full rounded-full border border-[var(--border)]" />
      )}
    </div>
  );
}
