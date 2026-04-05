"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "frontier-pulse-bookmarks";
const LEGACY_STORAGE_KEY = "ai-company-tracker-bookmarks";

type BookmarkContextValue = {
  bookmarks: string[];
  count: number;
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => void;
};

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      setBookmarks(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      setBookmarks([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [bookmarks, hydrated]);

  const value = useMemo<BookmarkContextValue>(
    () => ({
      bookmarks,
      count: bookmarks.length,
      isBookmarked(slug) {
        return bookmarks.includes(slug);
      },
      toggleBookmark(slug) {
        setBookmarks((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
      },
    }),
    [bookmarks],
  );

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);

  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarkProvider.");
  }

  return context;
}
