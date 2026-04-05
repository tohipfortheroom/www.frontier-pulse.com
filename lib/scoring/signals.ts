import {
  momentumSnapshots,
  companiesBySlug,
  type MomentumSnapshot,
  type MomentumEvent,
} from "@/lib/seed/data";

export type TrendSignalType =
  | "accelerating"
  | "decelerating"
  | "reversal"
  | "biggest-gap";

export type TrendSignal = {
  type: TrendSignalType;
  companySlug: string;
  companyName: string;
  title: string;
  description: string;
  sparkline: number[];
  magnitude: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** First-order finite differences of an array. */
function diffs(values: number[]): number[] {
  return values.slice(1).map((v, i) => v - values[i]);
}

/** Mean of a numeric array (returns 0 for empty). */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Compute acceleration (mean 2nd derivative) from a sparkline. */
function acceleration(sparkline: number[]): number {
  const firstDerivative = diffs(sparkline);
  const secondDerivative = diffs(firstDerivative);
  return mean(secondDerivative);
}

/* ------------------------------------------------------------------ */
/*  Signal detectors                                                   */
/* ------------------------------------------------------------------ */

function detectAccelerating(
  snapshots: MomentumSnapshot[],
): TrendSignal | null {
  let best: { snapshot: MomentumSnapshot; accel: number } | null = null;

  for (const snap of snapshots) {
    if (snap.scoreChange7d <= 0) continue; // must be growing
    const accel = acceleration(snap.sparkline);
    if (accel <= 0) continue; // must have positive 2nd derivative
    if (!best || accel > best.accel) {
      best = { snapshot: snap, accel };
    }
  }

  if (!best) return null;

  const company = companiesBySlug[best.snapshot.companySlug];
  return {
    type: "accelerating",
    companySlug: best.snapshot.companySlug,
    companyName: company?.name ?? best.snapshot.companySlug,
    title: "Accelerating momentum",
    description: `${company?.shortName ?? best.snapshot.companySlug} score is rising at an increasing rate over the past 7 days`,
    sparkline: best.snapshot.sparkline,
    magnitude: best.accel,
  };
}

function detectDecelerating(
  snapshots: MomentumSnapshot[],
): TrendSignal | null {
  let best: { snapshot: MomentumSnapshot; decel: number } | null = null;

  for (const snap of snapshots) {
    if (snap.scoreChange7d <= 0) continue; // still growing
    const accel = acceleration(snap.sparkline);
    if (accel >= 0) continue; // must have negative 2nd derivative (slowing)
    const magnitude = Math.abs(accel);
    if (!best || magnitude > best.decel) {
      best = { snapshot: snap, decel: magnitude };
    }
  }

  if (!best) return null;

  const company = companiesBySlug[best.snapshot.companySlug];
  return {
    type: "decelerating",
    companySlug: best.snapshot.companySlug,
    companyName: company?.name ?? best.snapshot.companySlug,
    title: "Momentum cooling",
    description: `${company?.shortName ?? best.snapshot.companySlug} is still gaining but growth rate is slowing`,
    sparkline: best.snapshot.sparkline,
    magnitude: best.decel,
  };
}

function detectReversal(snapshots: MomentumSnapshot[]): TrendSignal | null {
  let best: { snapshot: MomentumSnapshot; magnitude: number } | null = null;

  for (const snap of snapshots) {
    const shortTermDirection = Math.sign(snap.scoreChange24h);
    const longTermDirection = Math.sign(snap.scoreChange7d);

    // Directions must differ and neither can be zero
    if (
      shortTermDirection === 0 ||
      longTermDirection === 0 ||
      shortTermDirection === longTermDirection
    )
      continue;

    const magnitude =
      Math.abs(snap.scoreChange24h) + Math.abs(snap.scoreChange7d);
    if (!best || magnitude > best.magnitude) {
      best = { snapshot: snap, magnitude };
    }
  }

  if (!best) return null;

  const company = companiesBySlug[best.snapshot.companySlug];
  const shortUp = best.snapshot.scoreChange24h > 0;
  return {
    type: "reversal",
    companySlug: best.snapshot.companySlug,
    companyName: company?.name ?? best.snapshot.companySlug,
    title: "Reversal candidate",
    description: `${company?.shortName ?? best.snapshot.companySlug} 24h trend is ${shortUp ? "up" : "down"} while 7d trend is ${shortUp ? "down" : "up"}`,
    sparkline: best.snapshot.sparkline,
    magnitude: best.magnitude,
  };
}

function detectBiggestGap(snapshots: MomentumSnapshot[]): TrendSignal | null {
  const sorted = [...snapshots].sort((a, b) => a.rank - b.rank);

  let biggestGap = 0;
  let upperSnap: MomentumSnapshot | null = null;
  let lowerSnap: MomentumSnapshot | null = null;

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = Math.abs(sorted[i].score - sorted[i + 1].score);
    if (gap > biggestGap) {
      biggestGap = gap;
      upperSnap = sorted[i];
      lowerSnap = sorted[i + 1];
    }
  }

  if (!upperSnap || !lowerSnap) return null;

  const upperCompany = companiesBySlug[upperSnap.companySlug];
  const lowerCompany = companiesBySlug[lowerSnap.companySlug];

  return {
    type: "biggest-gap",
    companySlug: upperSnap.companySlug,
    companyName: upperCompany?.name ?? upperSnap.companySlug,
    title: "Biggest leaderboard gap",
    description: `${biggestGap.toFixed(1)}-point gap between #${upperSnap.rank} ${upperCompany?.shortName ?? upperSnap.companySlug} and #${lowerSnap.rank} ${lowerCompany?.shortName ?? lowerSnap.companySlug}`,
    sparkline: upperSnap.sparkline,
    magnitude: biggestGap,
  };
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export function computeTrendSignals(
  snapshots: MomentumSnapshot[] = momentumSnapshots,
  _events: MomentumEvent[] = [],
): TrendSignal[] {
  const detectors = [
    detectAccelerating,
    detectDecelerating,
    detectReversal,
    detectBiggestGap,
  ];

  const signals: TrendSignal[] = [];

  for (const detect of detectors) {
    const signal = detect(snapshots);
    if (signal) signals.push(signal);
  }

  // Sort by magnitude descending, return top 4
  signals.sort((a, b) => b.magnitude - a.magnitude);
  return signals.slice(0, 4);
}
