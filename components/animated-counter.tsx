"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AnimatedCounterProps = {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
};

function formatCounterValue(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function AnimatedCounter({
  label,
  target,
  prefix = "",
  suffix = "",
  duration = 1500,
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [started, setStarted] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStarted(true);
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setStarted(true);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (!started) {
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [duration, started, target]);

  const displayValue = started ? value : 0;

  return (
    <div ref={ref} className={cn("min-w-[140px] space-y-2", className)}>
      <div className="font-[family-name:var(--font-mono)] text-2xl font-semibold tracking-[-0.04em] text-[var(--accent-blue)] sm:text-[28px]">
        {prefix}
        {formatCounterValue(displayValue, decimals)}
        {suffix}
      </div>
      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </p>
    </div>
  );
}
