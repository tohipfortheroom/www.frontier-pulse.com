"use client";

import { useEffect, useId, useState } from "react";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from "recharts";

type TrendSparklineProps = {
  data: number[];
  color: string;
  variant?: "area" | "line";
  height?: number;
};

export function TrendSparkline({
  data,
  color,
  variant = "line",
  height = 48,
}: TrendSparklineProps) {
  const gradientId = useId();
  const [mounted, setMounted] = useState(false);
  const chartData = data.map((value, index) => ({ index, value }));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} className="w-full rounded-xl bg-[rgba(255,255,255,0.03)]" />;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {variant === "area" ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
