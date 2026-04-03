"use client";

import { BookmarkProvider } from "@/components/bookmark-provider";
import { ToastProvider } from "@/components/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <BookmarkProvider>{children}</BookmarkProvider>
    </ToastProvider>
  );
}
