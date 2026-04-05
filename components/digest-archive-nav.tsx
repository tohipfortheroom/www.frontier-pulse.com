"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface DigestArchiveNavProps {
  currentDate: string;
  availableDates: string[];
}

export function DigestArchiveNav({ currentDate, availableDates }: DigestArchiveNavProps) {
  const router = useRouter();

  const currentIndex = availableDates.indexOf(currentDate);
  const newerDate = currentIndex > 0 ? availableDates[currentIndex - 1] : undefined;
  const olderDate = currentIndex < availableDates.length - 1 ? availableDates[currentIndex + 1] : undefined;

  function navigateTo(date: string) {
    router.push(`/daily-digest?date=${date}`);
  }

  const formattedCurrent = format(new Date(currentDate + "T00:00:00"), "EEEE, MMMM d, yyyy");

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => olderDate && navigateTo(olderDate)}
          disabled={!olderDate}
          aria-label="Previous day"
          className="rounded-full border border-[var(--border)] p-2 transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>

        <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-secondary)]">
          {formattedCurrent}
        </span>

        <button
          type="button"
          onClick={() => newerDate && navigateTo(newerDate)}
          disabled={!newerDate}
          aria-label="Next day"
          className="rounded-full border border-[var(--border)] p-2 transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      <nav aria-label="Digest archive" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {availableDates.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => navigateTo(date)}
            className={`text-sm transition ${
              date === currentDate
                ? "font-medium text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {format(new Date(date + "T00:00:00"), "MMM d")}
          </button>
        ))}
      </nav>
    </div>
  );
}
