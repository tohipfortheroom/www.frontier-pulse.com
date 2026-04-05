import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { ChatWidget } from "@/components/chat-widget";
import { Footer } from "@/components/footer";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Navbar } from "@/components/navbar";
import { BRAND_ASSETS, BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

import "./globals.css";

const displayFont = Instrument_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    type: "website",
    siteName: BRAND_NAME,
    images: [
      {
        url: BRAND_ASSETS.socialImage,
        width: 1200,
        height: 630,
        alt: BRAND_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    images: [BRAND_ASSETS.socialImage],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: BRAND_ASSETS.iconPng32, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: BRAND_ASSETS.appleTouchIcon, sizes: "180x180", type: "image/png" }],
    shortcut: BRAND_ASSETS.iconPng32,
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0F" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chatEnabled = process.env.CHAT_ENABLED === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen bg-[var(--bg-primary)] font-[family-name:var(--font-body)] text-[var(--text-primary)] antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-[var(--accent-blue)] focus:px-4 focus:py-2 focus:text-[var(--text-inverse)]"
        >
          Skip to content
        </a>
        <AppProviders>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main id="main-content" className="relative flex-1">
              {children}
            </main>
            <Footer />
            <KeyboardShortcuts />
            {chatEnabled ? <ChatWidget /> : null}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
