"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    let frameId = 0;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = documentHeight > 0 ? Math.min(scrollTop / documentHeight, 1) : 0;

      setProgress(nextProgress);
      setShowTopButton(scrollTop > window.innerHeight * 0.9);
    };

    const onScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        updateProgress();
        frameId = 0;
      });
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-24 z-40 hidden h-[3px] bg-transparent lg:block">
        <div
          className="h-full origin-left bg-[var(--accent-blue)] shadow-[0_0_14px_var(--accent-blue-glow)] transition-transform duration-150"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={cn(
          "surface-card-strong fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:text-[var(--accent-blue)]",
          showTopButton ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </>
  );
}
