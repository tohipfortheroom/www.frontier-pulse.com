import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicompanytracker.vercel.app"),
  title: {
    default: "The AI Company Tracker",
    template: "%s | The AI Company Tracker",
  },
  description:
    "Track the AI race in real time with a live editorial scoreboard covering launches, funding, partnerships, regulation, and momentum shifts.",
  applicationName: "The AI Company Tracker",
  openGraph: {
    title: "The AI Company Tracker",
    description:
      "Track the AI race in real time with a live editorial scoreboard covering launches, funding, partnerships, regulation, and momentum shifts.",
    type: "website",
    siteName: "The AI Company Tracker",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "The AI Company Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The AI Company Tracker",
    description:
      "Track the AI race in real time with a live editorial scoreboard covering launches, funding, partnerships, regulation, and momentum shifts.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen bg-[var(--bg-primary)] font-[family-name:var(--font-body)] text-[var(--text-primary)] antialiased`}
      >
        <AppProviders>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="relative flex-1">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
