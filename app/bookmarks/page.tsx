import type { Metadata } from "next";

import { getNewsItemsData } from "@/lib/db/queries";

import { BookmarksPageClient } from "@/components/bookmarks-page-client";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: `Open your saved ${BRAND_NAME} stories and keep a lightweight reading list without signing in.`,
};

export default async function BookmarksPage() {
  const newsItems = await getNewsItemsData();

  return <BookmarksPageClient newsItems={newsItems} />;
}
