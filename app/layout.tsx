import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

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
  title: "The AI Company Tracker",
  description:
    "Track the AI race in real time with a live editorial scoreboard covering launches, funding, partnerships, regulation, and momentum shifts.",
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
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="relative flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
