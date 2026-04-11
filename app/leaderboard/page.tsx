import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";

import { getCompaniesIndexData, getLeaderboardRefreshState, getRecentMomentumEventsData } from "@/lib/db/queries";
import { companiesBySlug } from "@/lib/seed/data";
import { getCanonicalLeaderboardRecords } from "@/lib/surface-data";
import { formatScore } from "@/lib/utils";

import { LeaderboardCommandCenter } from "@/components/leaderboard-command-center";

const displayFont = Outfit({
  variable: "--leaderboard-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const monoFont = JetBrains_Mono({
  variable: "--leaderboard-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const companies = await getCompaniesIndexData();
    const leader = companies.find((record) => record.momentum?.rank === 1)?.momentum;
    const leaderName = leader ? companiesBySlug[leader.companySlug]?.name ?? leader.companySlug : undefined;
    const description = leader
      ? `${leaderName} leads with ${formatScore(leader.score)} momentum. See the full AI race ranking and the events that moved the board.`
      : "See the full AI race ranking, momentum changes, and the events that moved the board most recently.";

    return {
      title: "Leaderboard",
      description,
      openGraph: { title: "Leaderboard — Frontier Pulse", description, type: "website", siteName: "Frontier Pulse" },
    };
  } catch {
    return {
      title: "Leaderboard",
      description: "See the full AI race ranking, momentum changes, and the events that moved the board most recently.",
    };
  }
}

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [records, recentEvents, refreshState] = await Promise.all([
    getCompaniesIndexData(),
    getRecentMomentumEventsData(),
    getLeaderboardRefreshState(),
  ]);
  const canonicalRecords = getCanonicalLeaderboardRecords(records);

  return (
    <div className={`${displayFont.variable} ${monoFont.variable} relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-5 lg:py-16`}>
      <LeaderboardCommandCenter records={canonicalRecords} recentEvents={recentEvents} refreshState={refreshState} />
    </div>
  );
}
