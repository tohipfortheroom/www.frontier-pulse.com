"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import type { SourceHealthSnapshot } from "@/lib/ingestion/source-health";
import type { PipelineRunResult } from "@/lib/ingestion/types";
import { cn } from "@/lib/utils";

export function AdminIngestionPanel() {
  const [health, setHealth] = useState<SourceHealthSnapshot | null>(null);
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [runningTarget, setRunningTarget] = useState<"main" | "priority" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHealth() {
    const response = await fetch("/api/health", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Unable to load source health.");
    }

    const payload = (await response.json()) as SourceHealthSnapshot;
    setHealth(payload);
  }

  useEffect(() => {
    void loadHealth().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load source health.");
    });
  }, []);

  async function run(target: "main" | "priority") {
    try {
      setRunningTarget(target);
      setError(null);

      const response = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as PipelineRunResult;
      setResult(payload);
      await loadHealth();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run ingestion.");
    } finally {
      setRunningTarget(null);
    }
  }

  return (
    <div className="surface-card-strong space-y-6 rounded-3xl border border-[var(--border)] p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-green)]">
            Dev Controls
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Trigger ingestion, inspect source health, and verify that Frontier Pulse is still updating.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void run("main")}
            disabled={runningTarget !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-medium text-[var(--text-inverse)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={cn("h-4 w-4", runningTarget === "main" && "animate-spin")} />
            Run Ingestion Now
          </button>
          <button
            type="button"
            onClick={() => void run("priority")}
            disabled={runningTarget !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={cn("h-4 w-4", runningTarget === "priority" && "animate-spin")} />
            Run Priority Only
          </button>
        </div>
      </div>

      {health ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            health.currentStatus === "LIVE"
              ? "border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)]"
              : health.currentStatus === "STALE"
                ? "border-[var(--accent-red-border)] bg-[var(--accent-red-soft)]"
                : "border-[var(--accent-amber-border)] bg-[var(--accent-amber-soft)]",
          )}
        >
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {health.currentStatus}
          </p>
          <p className="mt-2 text-[var(--text-primary)]">{health.currentStatusReason}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] px-4 py-3 text-sm text-[var(--accent-red)]">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Fetched</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{result.fetchedCount}</p>
          </div>
          <div className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Normalized</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{result.normalizedCount}</p>
          </div>
          <div className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Stored</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{result.storedCount}</p>
          </div>
          <div className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Errors</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{result.errors.length}</p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="surface-inline rounded-2xl border border-[var(--border)] p-5">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">
              Preview of New Headlines
            </p>
            <div className="mt-4 space-y-3">
              {result.items.slice(0, 5).map((item) => (
                <div key={item.slug} className="surface-subtle rounded-xl border border-[var(--border)] p-3">
                  <p className="font-medium text-[var(--text-primary)]">{item.headline}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.shortSummary}</p>
                </div>
              ))}
              {result.items.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No new items were stored in this run.</p> : null}
            </div>
          </div>

          <div className="surface-inline rounded-2xl border border-[var(--border)] p-5">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-amber)]">
              Run Notes
            </p>
            <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
              <p>Status: {result.status}</p>
              <p>Reason: {result.statusReason}</p>
              <p>Last ingestion: {result.lastIngestionAt}</p>
              <p>Dry run: {result.dryRun ? "Yes" : "No"}</p>
              <p>Overlap prevented: {result.overlapPrevented ? "Yes" : "No"}</p>
              <p>Stale sources: {result.staleSourceIds.length > 0 ? result.staleSourceIds.join(", ") : "None"}</p>
            </div>
            {result.errors.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] p-4 text-sm text-[var(--accent-red)]">
                {result.errors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="surface-inline rounded-2xl border border-[var(--border)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-blue)]">
              Source Health
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Latest fetch status for every source in the pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              void loadHealth().catch((loadError) => {
                setError(loadError instanceof Error ? loadError.message : "Unable to load source health.");
              })
            }
            className="rounded-full border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          >
            Refresh Health
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {health?.sources.map((source) => (
            <div
              key={source.sourceId}
              className={cn(
                "grid gap-3 rounded-2xl border p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]",
                source.stale
                  ? "border-[var(--accent-red-border)] bg-[var(--accent-red-soft)]"
                  : source.degraded
                    ? "border-[var(--accent-amber-border)] bg-[var(--accent-amber-soft)]"
                  : "border-[var(--border)] bg-[var(--surface-subtle)]",
              )}
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">{source.sourceName}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {source.sourceId} • {source.sourceKind} • priority {source.priority}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Status</p>
                <p className={cn("mt-1 text-sm capitalize", source.status === "error" ? "text-[var(--accent-red)]" : "text-[var(--text-primary)]")}>
                  {source.status}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Fetched / Inserted / Updated</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {source.itemsFetched} / {source.itemsInserted} / {source.itemsUpdated}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Last Check</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">{source.lastCheckedAt ?? "Never"}</p>
              </div>
              {source.currentStatusReason ? (
                <p className="text-sm text-[var(--text-secondary)] md:col-span-4">{source.currentStatusReason}</p>
              ) : null}
              {source.failureReason ? (
                <p className="text-sm text-[var(--accent-red)] md:col-span-4">{source.failureReason}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {health?.recentRuns.length ? (
        <div className="surface-inline rounded-2xl border border-[var(--border)] p-5">
          <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">
            Recent Runs
          </p>
          <div className="mt-5 grid gap-3">
            {health.recentRuns.slice(0, 6).map((run) => (
              <div key={run.runId} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:grid-cols-[0.7fr_1.3fr_0.9fr_0.9fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Status</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{run.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Started</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{run.startedAt}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Fetched / Inserted</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    {run.fetchedCount} / {run.insertedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Failures</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{run.sourceFailureCount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
