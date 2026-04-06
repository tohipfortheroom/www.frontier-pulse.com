import { format, isToday, isYesterday } from "date-fns";

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

export function formatSmartTime(date: Date | string) {
  const d = new Date(date);

  if (isToday(d)) {
    return `Today ${format(d, "h:mm a")}`;
  }

  if (isYesterday(d)) {
    return `Yesterday ${format(d, "h:mm a")}`;
  }

  return format(d, "MMM d, h:mm a");
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
      bg: "bg-[var(--accent-green-soft)]",
      border: "border-[var(--accent-green-border)]",
      text: "text-[var(--accent-green)]",
      softText: "text-[var(--accent-green)]",
      glow: "shadow-[0_0_26px_var(--accent-green-glow)]",
      ring: "ring-[var(--accent-green-ring)]",
    },
    red: {
      bg: "bg-[var(--accent-red-soft)]",
      border: "border-[var(--accent-red-border)]",
      text: "text-[var(--accent-red)]",
      softText: "text-[var(--accent-red)]",
      glow: "shadow-[0_0_26px_var(--accent-red-glow)]",
      ring: "ring-[var(--accent-red-ring)]",
    },
    blue: {
      bg: "bg-[var(--accent-blue-soft)]",
      border: "border-[var(--accent-blue-border)]",
      text: "text-[var(--accent-blue)]",
      softText: "text-[var(--accent-blue)]",
      glow: "shadow-[0_0_26px_var(--accent-blue-glow)]",
      ring: "ring-[var(--accent-blue-ring)]",
    },
    amber: {
      bg: "bg-[var(--accent-amber-soft)]",
      border: "border-[var(--accent-amber-border)]",
      text: "text-[var(--accent-amber)]",
      softText: "text-[var(--accent-amber)]",
      glow: "shadow-[0_0_26px_var(--accent-amber-glow)]",
      ring: "ring-[var(--accent-amber-ring)]",
    },
    purple: {
      bg: "bg-[var(--accent-purple-soft)]",
      border: "border-[var(--accent-purple-border)]",
      text: "text-[var(--accent-purple)]",
      softText: "text-[var(--accent-purple)]",
      glow: "shadow-[0_0_26px_var(--accent-purple-glow)]",
      ring: "ring-[var(--accent-purple-ring)]",
    },
    neutral: {
      bg: "bg-[var(--surface-soft)]",
      border: "border-[var(--border)]",
      text: "text-[var(--text-secondary)]",
      softText: "text-[var(--text-secondary)]",
      glow: "shadow-[var(--shadow-soft)]",
      ring: "ring-[var(--border-hover)]",
    },
  };

  return tones[tone];
}
