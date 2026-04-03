"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const donutColors = ["#4D9FFF", "#00E68A", "#FFB84D", "#A78BFA", "#FF4D6A", "#6EE7B7", "#60A5FA", "#F59E0B"];

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
                background: "rgba(18,18,26,0.96)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />
      )}
    </div>
  );
}
