"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type HorizontalScrollerProps = {
  children: React.ReactNode;
  viewportClassName?: string;
  trackClassName?: string;
  scrollBy?: number;
};

export function HorizontalScroller({
  children,
  viewportClassName,
  trackClassName,
  scrollBy = 320,
}: HorizontalScrollerProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const currentElement = viewportRef.current;

    if (!currentElement) {
      return;
    }

    const viewport = currentElement;

    function syncScrollState() {
      setCanScrollLeft(viewport.scrollLeft > 8);
      setCanScrollRight(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 8);
    }

    syncScrollState();
    viewport.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      viewport.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, []);

  function scroll(direction: "left" | "right") {
    viewportRef.current?.scrollBy({
      left: direction === "left" ? -scrollBy : scrollBy,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "linear-gradient(90deg, var(--bg-card), transparent)" }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "linear-gradient(270deg, var(--bg-card), transparent)" }}
      />

      <button
        type="button"
        onClick={() => scroll("left")}
        className={cn(
          "surface-card-strong absolute left-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:text-[var(--text-primary)] md:flex",
          !canScrollLeft && "pointer-events-none opacity-0",
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className={cn(
          "surface-card-strong absolute right-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:text-[var(--text-primary)] md:flex",
          !canScrollRight && "pointer-events-none opacity-0",
        )}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div ref={viewportRef} className={cn("scrollbar-none overflow-x-auto", viewportClassName)}>
        <div className={cn("flex min-w-max gap-4 snap-x snap-mandatory", trackClassName)}>{children}</div>
      </div>
    </div>
  );
}
