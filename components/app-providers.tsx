"use client";

import { BookmarkProvider } from "@/components/bookmark-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BookmarkProvider>{children}</BookmarkProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
