"use client";

import { useId } from "react";

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
  const width = 120;
  const safeData = data.length > 1 ? data : [0, ...(data.length === 1 ? data : [0])];
  const minValue = Math.min(...safeData);
  const maxValue = Math.max(...safeData);
  const range = maxValue - minValue || 1;

  const points = safeData.map((value, index) => {
    const x = (index / (safeData.length - 1)) * width;
    const y = 36 - ((value - minValue) / range) * 30;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} 40 L 0 40 Z`;

  return (
    <div style={{ height }} className="w-full">
      <svg
        viewBox={`0 0 ${width} 40`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {variant === "area" ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
