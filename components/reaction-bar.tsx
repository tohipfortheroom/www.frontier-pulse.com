"use client";

import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { fetchWithTimeout } from "@/lib/network/fetch";
import { type ReactionType } from "@/lib/seed/data";
import { cn } from "@/lib/utils";

type ReactionSummary = {
  counts: Record<ReactionType, number>;
  selected: ReactionType | null;
};

const STORAGE_KEY = "fp_visitor_id";

const REACTIONS: Array<{
  type: ReactionType;
  emoji: string;
  label: string;
}> = [
  { type: "fire", emoji: "\u{1F525}", label: "Fire" },
  { type: "mind_blown", emoji: "\u{1F92F}", label: "Mind blown" },
  { type: "bearish", emoji: "\u{1F4C9}", label: "Bearish" },
  { type: "bullish", emoji: "\u{1F4C8}", label: "Bullish" },
  { type: "yawn", emoji: "\u{1F971}", label: "Yawn" },
];

function emptySummary(): ReactionSummary {
  return {
    counts: {
      fire: 0,
      mind_blown: 0,
      bearish: 0,
      bullish: 0,
      yawn: 0,
    },
    selected: null,
  };
}

function getVisitorId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, next);
  return next;
}

interface ReactionBarProps {
  newsItemSlug: string;
  initialCounts?: Record<string, number>;
}

export function ReactionBar({ newsItemSlug, initialCounts }: ReactionBarProps) {
  const [visitorId, setVisitorId] = useState("");
  const [summary, setSummary] = useState<ReactionSummary>(() => {
    if (initialCounts) {
      return {
        counts: {
          fire: initialCounts.fire ?? 0,
          mind_blown: initialCounts.mind_blown ?? 0,
          bearish: initialCounts.bearish ?? 0,
          bullish: initialCounts.bullish ?? 0,
          yawn: initialCounts.yawn ?? 0,
        },
        selected: null,
      };
    }
    return emptySummary();
  });
  const [isLoading, setIsLoading] = useState(!initialCounts);
  const [isMutating, setIsMutating] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    const nextVisitorId = getVisitorId();
    setVisitorId(nextVisitorId);

    void (async () => {
      try {
        const response = await fetchWithTimeout(
          `/api/reactions?slug=${encodeURIComponent(newsItemSlug)}&visitorId=${encodeURIComponent(nextVisitorId)}`,
          {
            headers: {
              "x-visitor-id": nextVisitorId,
            },
            timeoutMs: 10_000,
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load reactions.");
        }

        const payload = (await response.json()) as ReactionSummary;
        setSummary(payload);
      } catch {
        if (!initialCounts) {
          setSummary(emptySummary());
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [newsItemSlug, initialCounts]);

  const total = useMemo(
    () => Object.values(summary.counts).reduce((sum, count) => sum + count, 0),
    [summary.counts],
  );

  async function toggleReaction(nextReaction: ReactionType) {
    if (!visitorId || isMutating) {
      return;
    }

    const previous = summary;
    const optimistic = structuredClone(summary) as ReactionSummary;

    if (optimistic.selected === nextReaction) {
      optimistic.counts[nextReaction] = Math.max(0, optimistic.counts[nextReaction] - 1);
      optimistic.selected = null;
    } else {
      if (optimistic.selected) {
        optimistic.counts[optimistic.selected] = Math.max(0, optimistic.counts[optimistic.selected] - 1);
      }
      optimistic.counts[nextReaction] += 1;
      optimistic.selected = nextReaction;
    }

    setSummary(optimistic);
    setIsMutating(true);

    try {
      const response = await fetchWithTimeout("/api/reactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: newsItemSlug,
          visitorId,
          reactionType: nextReaction,
        }),
        timeoutMs: 10_000,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to update reactions.");
      }

      const payload = (await response.json()) as ReactionSummary;
      setSummary(payload);
    } catch (error) {
      setSummary(previous);
      pushToast({
        tone: "error",
        title: "Reaction unavailable",
        description: error instanceof Error ? error.message : "Unable to update reactions.",
      });
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1"
      role="group"
      aria-label={`Reader reactions — ${total} total`}
    >
      {REACTIONS.map((reaction) => {
        const selected = summary.selected === reaction.type;
        const count = summary.counts[reaction.type];

        return (
          <button
            key={reaction.type}
            type="button"
            onClick={() => void toggleReaction(reaction.type)}
            disabled={isLoading || isMutating}
            className={cn(
              "rounded-full px-2 py-1 text-sm transition-all duration-200 hover:scale-[1.04] hover:bg-[var(--surface-card)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60",
              selected && "bg-[var(--surface-card)] ring-1 ring-[var(--accent-blue-border)] shadow-[0_0_0_1px_var(--accent-blue-border)]",
            )}
            aria-label={`${reaction.label} reaction`}
            aria-pressed={selected}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            {count > 0 && (
              <span className="ml-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-tertiary)]">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
