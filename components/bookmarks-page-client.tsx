"use client";

import type { NewsItem } from "@/lib/seed/data";

import { useBookmarks } from "@/components/bookmark-provider";
import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import { SectionHeader } from "@/components/section-header";

export function BookmarksPageClient({ newsItems }: { newsItems: NewsItem[] }) {
  const { bookmarks } = useBookmarks();
  const savedItems = newsItems.filter((item) => bookmarks.includes(item.slug));

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="READING LIST"
          title="Saved stories for later"
          subtitle="Keep the most important moves close, then come back when you have time to read them properly."
          tone="blue"
        />
      </section>

      <section className="fade-slide-up mt-12" style={{ animationDelay: "0.08s" }}>
        {savedItems.length > 0 ? (
          <div className="grid gap-5">
            {savedItems.map((item) => (
              <NewsCard key={item.slug} news={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved stories yet"
            description="Bookmark any news card to build a personal reading list across the tracker."
            actionHref="/news"
            actionLabel="Browse news"
          />
        )}
      </section>
    </div>
  );
}
