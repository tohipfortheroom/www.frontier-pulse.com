"use client";

import { differenceInMinutes } from "date-fns";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/toast-provider";
import type { SourceHealthSnapshot } from "@/lib/ingestion/source-health";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { fetchJsonWithRetry } from "@/lib/network/fetch";
import { cn, formatUpdateTimestamp } from "@/lib/utils";

type FreshnessState = Pick<
  SourceHealthSnapshot,
  "configured" | "currentStatus" | "currentStatusReason" | "quietFeed" | "lastSucceededAt" | "lastIngestionAt" | "staleData" | "sourceSummary"
>;

export function DataFreshnessIndicator() {
  const [freshness, setFreshness] = useState<FreshnessState | null>(null);
  const [now, setNow] = useState(new Date());
  const { pushToast } = useToast();
  const isOnline = useNetworkStatus();
  const hasAlertedRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    let active = true;

    async function loadFreshness() {
      try {
        const payload = await fetchJsonWithRetry<SourceHealthSnapshot>("/api/health", {
          cache: "no-store",
          timeoutMs: 5_000,
          retries: 1,
          allowNonOk: true,
        });

        if (active) {
          setFreshness({
            configured: payload.configured,
            currentStatus: payload.currentStatus,
            currentStatusReason: payload.currentStatusReason,
            quietFeed: payload.quietFeed,
            lastSucceededAt: payload.lastSucceededAt,
            lastIngestionAt: payload.lastIngestionAt,
            staleData: payload.staleData,
            sourceSummary: payload.sourceSummary,
          });
          hasAlertedRef.current = false;
        }
      } catch (error) {
        if (!hasAlertedRef.current) {
          pushToast({
            tone: "error",
            title: "Health check unavailable",
            description: error instanceof Error ? error.message : "Unable to refresh source health.",
          });
          hasAlertedRef.current = true;
        }
      }
    }

    void loadFreshness();
    const fetchInterval = window.setInterval(() => {
      void loadFreshness();
    }, 300_000);
    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(fetchInterval);
      window.clearInterval(clockInterval);
    };
  }, [isOnline, pushToast]);

  if (!isOnline) {
    return (
      <div className="hidden items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--accent-red)] sm:flex">
        <span className="h-2 w-2 rounded-full bg-[var(--accent-red)]" />
        <span>Offline</span>
      </div>
    );
  }

  if (!freshness) {
    return <div className="hidden h-4 w-28 animate-pulse rounded-full bg-[var(--surface-soft)] sm:flex" aria-hidden="true" />;
  }

  const referenceTime = freshness.lastSucceededAt ?? freshness.lastIngestionAt;
  const minutesAgo = referenceTime ? Math.max(0, differenceInMinutes(now, new Date(referenceTime))) : null;
  const toneClass =
    !freshness.configured
      ? "text-[var(--text-tertiary)]"
      : freshness.currentStatus === "LIVE"
      ? "text-[var(--text-tertiary)]"
      : freshness.currentStatus === "STALE"
        ? "text-[var(--accent-red)]"
        : "text-[var(--accent-amber)]";
  const dotClass =
    !freshness.configured
      ? "bg-[var(--text-tertiary)]"
      : freshness.currentStatus === "LIVE"
      ? "bg-[var(--accent-green)]"
      : freshness.currentStatus === "STALE"
        ? "bg-[var(--accent-red)]"
        : "bg-[var(--accent-amber)]";
  const label =
    !freshness.configured
          ? "Preview data"
          : freshness.currentStatus === "LIVE"
          ? freshness.quietFeed
        ? "Sources checked recently"
        : minutesAgo === null
          ? "All systems live"
          : `Updated ${formatUpdateTimestamp(referenceTime).toLowerCase()}`
      : freshness.currentStatus === "DELAYED"
        ? "Ingestion delayed"
        : freshness.currentStatus === "DEGRADED"
          ? (freshness.sourceSummary?.degraded ?? 0) <= 2
            ? "Sources checked recently"
            : "Some sources degraded"
          : "Feed stale";

  return (
    <div
      className={cn("hidden items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] sm:flex", toneClass)}
      title={freshness.currentStatusReason}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span>{label}</span>
    </div>
  );
}
