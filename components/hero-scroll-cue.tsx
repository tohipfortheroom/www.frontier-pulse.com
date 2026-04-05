"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function HeroScrollCue({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY < window.innerHeight * 0.45);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className={cn(
        "surface-elevated group inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] backdrop-blur-sm transition-all duration-300 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      <span>Scroll to explore</span>
      <ChevronDown className="h-3.5 w-3.5 animate-[heroCueBounce_2s_infinite]" />
    </button>
  );
}
