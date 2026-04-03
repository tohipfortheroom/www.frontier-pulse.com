import { format, formatDistanceToNowStrict } from "date-fns";

export type AccentTone = "green" | "red" | "blue" | "amber" | "purple" | "neutral";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatScore(value: number, digits = 1) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}

export function formatCompactDate(date: Date | string) {
  return format(new Date(date), "MMM d");
}

export function formatTimestamp(date: Date | string) {
  return format(new Date(date), "MMM d, h:mm a");
}

export function formatRelativeTime(date: Date | string, referenceDate: Date | string = new Date()) {
  return `${formatDistanceToNowStrict(new Date(date), {
    addSuffix: false,
    unit: "minute",
    roundingMethod: "round",
  })} ago`;
}

export function getImportanceLabel(score: number) {
  if (score >= 8) {
    return "Critical";
  }

  if (score >= 5) {
    return "Notable";
  }

  return "Standard";
}

export function getConfidenceLabel(score: number) {
  if (score >= 8) {
    return "High";
  }

  if (score >= 5) {
    return "Medium";
  }

  return "Developing";
}

export function getChangeTone(value: number): AccentTone {
  if (value > 0) {
    return "green";
  }

  if (value < 0) {
    return "red";
  }

  return "neutral";
}

export function accentClasses(tone: AccentTone) {
  const tones: Record<
    AccentTone,
    {
      bg: string;
      border: string;
      text: string;
      softText: string;
      glow: string;
      ring: string;
    }
  > = {
    green: {
      bg: "bg-[rgba(0,230,138,0.12)]",
      border: "border-[rgba(0,230,138,0.26)]",
      text: "text-[var(--accent-green)]",
      softText: "text-[rgba(0,230,138,0.86)]",
      glow: "shadow-[0_0_26px_rgba(0,230,138,0.12)]",
      ring: "ring-[rgba(0,230,138,0.18)]",
    },
    red: {
      bg: "bg-[rgba(255,77,106,0.12)]",
      border: "border-[rgba(255,77,106,0.24)]",
      text: "text-[var(--accent-red)]",
      softText: "text-[rgba(255,77,106,0.9)]",
      glow: "shadow-[0_0_26px_rgba(255,77,106,0.12)]",
      ring: "ring-[rgba(255,77,106,0.18)]",
    },
    blue: {
      bg: "bg-[rgba(77,159,255,0.12)]",
      border: "border-[rgba(77,159,255,0.24)]",
      text: "text-[var(--accent-blue)]",
      softText: "text-[rgba(77,159,255,0.9)]",
      glow: "shadow-[0_0_26px_rgba(77,159,255,0.12)]",
      ring: "ring-[rgba(77,159,255,0.18)]",
    },
    amber: {
      bg: "bg-[rgba(255,184,77,0.12)]",
      border: "border-[rgba(255,184,77,0.26)]",
      text: "text-[var(--accent-amber)]",
      softText: "text-[rgba(255,184,77,0.92)]",
      glow: "shadow-[0_0_26px_rgba(255,184,77,0.12)]",
      ring: "ring-[rgba(255,184,77,0.18)]",
    },
    purple: {
      bg: "bg-[rgba(167,139,250,0.12)]",
      border: "border-[rgba(167,139,250,0.26)]",
      text: "text-[var(--accent-purple)]",
      softText: "text-[rgba(167,139,250,0.92)]",
      glow: "shadow-[0_0_26px_rgba(167,139,250,0.14)]",
      ring: "ring-[rgba(167,139,250,0.18)]",
    },
    neutral: {
      bg: "bg-[rgba(136,136,160,0.12)]",
      border: "border-[rgba(136,136,160,0.18)]",
      text: "text-[var(--text-secondary)]",
      softText: "text-[var(--text-secondary)]",
      glow: "shadow-[0_0_20px_rgba(136,136,160,0.08)]",
      ring: "ring-[rgba(136,136,160,0.14)]",
    },
  };

  return tones[tone];
}
