import { differenceInHours, subDays } from "date-fns";

export type EventType =
  | "Major model release"
  | "Major product launch"
  | "Enterprise partnership"
  | "Funding round"
  | "Infrastructure expansion"
  | "Research breakthrough"
  | "Benchmark claim"
  | "Executive change"
  | "Controversy"
  | "Failed/delayed launch"
  | "Regulatory setback";

export type MomentumEventLike = {
  companySlug: string;
  eventType: EventType;
  scoreDelta?: number;
  eventDate: string;
};

export const EVENT_WEIGHTS: Record<EventType, number> = {
  "Major model release": 10,
  "Major product launch": 8,
  "Enterprise partnership": 7,
  "Funding round": 6,
  "Infrastructure expansion": 6,
  "Research breakthrough": 5,
  "Benchmark claim": 3,
  "Executive change": 3,
  Controversy: -4,
  "Failed/delayed launch": -5,
  "Regulatory setback": -6,
};

export function getBaseWeight(eventType: EventType) {
  return EVENT_WEIGHTS[eventType];
}

export function applyTimeDecay(baseScore: number, eventDate: Date | string, referenceDate: Date | string) {
  const hoursSinceEvent = Math.max(0, differenceInHours(new Date(referenceDate), new Date(eventDate)));
  const daysSinceEvent = hoursSinceEvent / 24;

  if (daysSinceEvent > 30) {
    return 0;
  }

  return baseScore * Math.pow(0.9, daysSinceEvent);
}

export function calculateMomentumScore(events: MomentumEventLike[], companySlug: string, referenceDate: Date | string) {
  return events
    .filter((event) => event.companySlug === companySlug)
    .reduce((total, event) => {
      const baseScore = event.scoreDelta ?? getBaseWeight(event.eventType);
      return total + applyTimeDecay(baseScore, event.eventDate, referenceDate);
    }, 0);
}

export function calculateMomentumChange(
  events: MomentumEventLike[],
  companySlug: string,
  referenceDate: Date | string,
  daysAgo: number,
) {
  const current = calculateMomentumScore(events, companySlug, referenceDate);
  const prior = calculateMomentumScore(events, companySlug, subDays(new Date(referenceDate), daysAgo));
  return current - prior;
}
