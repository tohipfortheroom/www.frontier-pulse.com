"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

import { useBookmarks } from "@/components/bookmark-provider";
import { cn } from "@/lib/utils";

export function BookmarkButton({ slug, className }: { slug: string; className?: string }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const active = isBookmarked(slug);

  return (
    <button
      type="button"
      onClick={() => toggleBookmark(slug)}
      className={cn(
        "surface-soft inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]",
        active && "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]",
        className,
      )}
      aria-label={active ? "Remove bookmark" : "Save bookmark"}
    >
      <Bookmark className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}

export function BookmarkCountBadge() {
  const { count } = useBookmarks();

  return (
    <Link
      href="/bookmarks"
      className="surface-soft inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
    >
      <Bookmark className="h-3.5 w-3.5" />
      <span className="font-[family-name:var(--font-mono)] uppercase tracking-[0.12em]">{count}</span>
    </Link>
  );
}
