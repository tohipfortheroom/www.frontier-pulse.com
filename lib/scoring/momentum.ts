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

const MOMENTUM_WINDOW_DAYS = 30;
const MOMENTUM_DAILY_DECAY = 0.86;
const MOMENTUM_SCORE_SCALE = 2.2;
const MOMENTUM_ACTIVE_WEIGHT_FLOOR = 3.5;
const DAILY_IMPACT_CAP = 10;
const DAILY_IMPACT_MULTIPLIER = 2.5;

export function getBaseWeight(eventType: EventType) {
  return EVENT_WEIGHTS[eventType];
}

export function applyTimeDecay(baseScore: number, eventDate: Date | string, referenceDate: Date | string) {
  const hoursSinceEvent = Math.max(0, differenceInHours(new Date(referenceDate), new Date(eventDate)));
  const daysSinceEvent = hoursSinceEvent / 24;

  if (daysSinceEvent > MOMENTUM_WINDOW_DAYS) {
    return 0;
  }

  return baseScore * Math.pow(0.9, daysSinceEvent);
}

export function normalizeDailyImpact(rawImpact: number) {
  if (!Number.isFinite(rawImpact) || rawImpact === 0) {
    return 0;
  }

  const normalizedMagnitude = Math.min(DAILY_IMPACT_CAP, Math.log1p(Math.abs(rawImpact)) * DAILY_IMPACT_MULTIPLIER);
  return Math.sign(rawImpact) * normalizedMagnitude;
}

function getElapsedWindowDays(eventDate: Date | string, referenceDate: Date | string) {
  const elapsedHours = differenceInHours(new Date(referenceDate), new Date(eventDate));

  if (!Number.isFinite(elapsedHours) || elapsedHours < 0) {
    return null;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays > MOMENTUM_WINDOW_DAYS ? null : elapsedDays;
}

function buildDailyImpactMap(events: MomentumEventLike[], companySlug: string, referenceDate: Date | string) {
  const dailyImpactByElapsedDay = new Map<number, number>();

  events.forEach((event) => {
    if (event.companySlug !== companySlug) {
      return;
    }

    const elapsedDays = getElapsedWindowDays(event.eventDate, referenceDate);

    if (elapsedDays === null) {
      return;
    }

    const baseScore = event.scoreDelta ?? getBaseWeight(event.eventType);
    dailyImpactByElapsedDay.set(elapsedDays, (dailyImpactByElapsedDay.get(elapsedDays) ?? 0) + baseScore);
  });

  return dailyImpactByElapsedDay;
}

export function calculateMomentumScore(events: MomentumEventLike[], companySlug: string, referenceDate: Date | string) {
  const dailyImpactByElapsedDay = buildDailyImpactMap(events, companySlug, referenceDate);

  if (dailyImpactByElapsedDay.size === 0) {
    return 0;
  }

  let weightedImpact = 0;
  let activeWeight = 0;

  for (let elapsedDays = 0; elapsedDays <= MOMENTUM_WINDOW_DAYS; elapsedDays += 1) {
    const rawDailyImpact = dailyImpactByElapsedDay.get(elapsedDays) ?? 0;
    const normalizedDailyImpact = normalizeDailyImpact(rawDailyImpact);
    const weight = Math.pow(MOMENTUM_DAILY_DECAY, elapsedDays);

    weightedImpact += normalizedDailyImpact * weight;

    if (rawDailyImpact !== 0) {
      activeWeight += weight;
    }
  }

  if (activeWeight === 0) {
    return 0;
  }

  return (weightedImpact / Math.max(activeWeight, MOMENTUM_ACTIVE_WEIGHT_FLOOR)) * MOMENTUM_SCORE_SCALE;
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
