"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type SectionNavProps = {
  sections: Array<{
    id: string;
    label: string;
  }>;
};

export function SectionNav({ sections }: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-42% 0px -42% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [sections]);

  return (
    <aside className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex">
      <div className="surface-card-strong flex flex-col gap-3 rounded-full border border-[var(--border)] px-2 py-3 backdrop-blur-xl">
        {sections.map((section) => {
          const active = section.id === activeId;

          return (
            <button
              key={section.id}
              type="button"
              aria-label={section.label}
              title={section.label}
              onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="group/nav relative flex h-4 w-4 items-center justify-center"
            >
              <span
                className={cn(
                  "surface-soft block h-2.5 w-2.5 rounded-full border border-[var(--border)] transition-all duration-200",
                  active && "h-3 w-3 border-[var(--accent-blue-border)] bg-[var(--accent-blue)] shadow-[0_0_16px_var(--accent-blue-glow)]",
                )}
              />
              <span className="surface-card-strong pointer-events-none absolute right-6 whitespace-nowrap rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-soft)] transition-all duration-200 group-hover/nav:translate-x-0 group-hover/nav:opacity-100">
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
