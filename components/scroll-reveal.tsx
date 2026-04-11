"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    // Keep content visible even if intersection events are delayed or never fire.
    const fallbackReveal = window.setTimeout(() => {
      setRevealed(true);
    }, 1200);

    if (element.getBoundingClientRect().top <= window.innerHeight * 1.15) {
      setRevealed(true);
      return () => window.clearTimeout(fallbackReveal);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setRevealed(true);
        window.clearTimeout(fallbackReveal);
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px 18% 0px",
        threshold: 0.01,
      },
    );

    observer.observe(element);

    return () => {
      window.clearTimeout(fallbackReveal);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out will-change-transform motion-reduce:translate-y-0 motion-reduce:opacity-100",
        revealed ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
