import { getSupabaseReadClient, getSupabaseServiceClient, isSupabaseReadConfigured } from "../db/client.ts";
import { seedNow, sortedNewsItems, sourceHealthSeed } from "../seed/data.ts";
import { PIPELINE_NAME } from "./config.ts";
import { derivePipelineHealthState, deriveSourceRuntimeState, type PipelineHealthState } from "./health-model.ts";
import { getPipelineStateRow, getRecentRunSummaries, type PipelineStateRow } from "./run-state.ts";
import type { SourceDefinition, SourceRunResult } from "./types.ts";

export type SourceHealthRow = {
  source_id: string;
  source_name: string;
  source_kind: string;
  priority: number;
  reliability: number;
  last_fetched_at: string | null;
  last_success_at: string | null;
  last_status: "idle" | "success" | "error";
  last_error: string | null;
  last_items_returned: number;
  last_items_stored: number;
  last_new_item_at: string | null;
  last_checked_at: string | null;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  status: "idle" | "running" | "live" | "delayed" | "degraded" | "stale" | "error";
  failure_reason: string | null;
  consecutive_failures: number;
  latest_item_published_at: string | null;
  last_duration_ms: number | null;
  items_fetched: number;
  items_inserted: number;
  items_updated: number;
  duplicates_filtered: number;
  invalid_rejected: number;
  old_rejected: number;
  updated_at: string;
};

export type SourceHealthStatus = {
  sourceId: string;
  sourceName: string;
  sourceKind: string;
  priority: number;
  reliability: number;
  status: SourceHealthRow["status"];
  currentStatusReason: string | null;
  failureReason: string | null;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  latestItemPublishedAt: string | null;
  lastDurationMs: number | null;
  itemsFetched: number;
  itemsInserted: number;
  itemsUpdated: number;
  duplicatesFiltered: number;
  invalidRejected: number;
  oldRejected: number;
  lastNewItemAt: string | null;
  stale: boolean;
  degraded: boolean;
  runtimeState: ReturnType<typeof deriveSourceRuntimeState>["runtimeState"];
  lastFetchedAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: "idle" | "success" | "error";
  lastError: string | null;
  lastItemsReturned: number;
  lastItemsStored: number;
};

export type SourceHealthUpdate = {
  source: SourceDefinition;
  result: SourceRunResult;
  lastNewItemAt: string | null;
};

export type SourceHealthSnapshot = {
  configured: boolean;
  pipelineName: string;
  generatedAt: string;
  currentStatus: PipelineHealthState;
  currentStatusReason: string;
  quietFeed: boolean;
  delayed: boolean;
  degraded: boolean;
  staleData: boolean;
  lastAttemptedAt: string | null;
  lastSucceededAt: string | null;
  lastFullSuccessAt: string | null;
  lastPartialSuccessAt: string | null;
  latestPublishedAt: string;
  lastIngestionAt: string;
  consecutiveFailures: number;
  sourceSummary: {
    total: number;
    healthy: number;
    degraded: number;
    stale: number;
  };
  recentRuns: Awaited<ReturnType<typeof getRecentRunSummaries>>;
  sources: SourceHealthStatus[];
};

function buildFallbackRow(source: SourceDefinition): SourceHealthRow {
  const fallback = sourceHealthSeed.find((entry) => entry.sourceId === source.id);
  const lastCheckedAt = fallback?.lastCheckedAt ?? fallback?.lastFetchedAt ?? null;
  const lastSucceededAt = fallback?.lastSucceededAt ?? fallback?.lastSuccessAt ?? null;
  const lastFailedAt = fallback?.lastFailedAt ?? (fallback?.lastStatus === "error" ? lastCheckedAt : null) ?? null;
  const status =
    fallback?.status ??
    (fallback?.lastStatus === "error" ? "error" : fallback?.lastStatus === "success" ? "live" : "idle");

  return {
    source_id: source.id,
    source_name: source.name,
    source_kind: source.kind,
    priority: source.priority,
    reliability: source.reliability,
    last_fetched_at: fallback?.lastFetchedAt ?? null,
    last_success_at: fallback?.lastSuccessAt ?? null,
    last_status: fallback?.lastStatus ?? "idle",
    last_error: fallback?.lastError ?? null,
    last_items_returned: fallback?.lastItemsReturned ?? 0,
    last_items_stored: fallback?.lastItemsStored ?? 0,
    last_new_item_at: fallback?.lastNewItemAt ?? null,
    last_checked_at: lastCheckedAt,
    last_succeeded_at: lastSucceededAt,
    last_failed_at: lastFailedAt,
    status,
    failure_reason: fallback?.failureReason ?? fallback?.lastError ?? null,
    consecutive_failures: fallback?.consecutiveFailures ?? (fallback?.lastStatus === "error" ? 1 : 0),
    latest_item_published_at: fallback?.latestItemPublishedAt ?? fallback?.lastNewItemAt ?? null,
    last_duration_ms: fallback?.lastDurationMs ?? null,
    items_fetched: fallback?.itemsFetched ?? fallback?.lastItemsReturned ?? 0,
    items_inserted: fallback?.itemsInserted ?? fallback?.lastItemsStored ?? 0,
    items_updated: fallback?.itemsUpdated ?? 0,
    duplicates_filtered: fallback?.duplicatesFiltered ?? 0,
    invalid_rejected: fallback?.invalidRejected ?? 0,
    old_rejected: fallback?.oldRejected ?? 0,
    updated_at: lastCheckedAt ?? seedNow.toISOString(),
  };
}

function mapLegacyStatus(status: SourceHealthRow["status"], lastStatus: SourceHealthRow["last_status"]) {
  if (lastStatus) {
    return lastStatus;
  }

  if (status === "error") {
    return "error";
  }

  if (status === "idle") {
    return "idle";
  }

  return "success";
}

function buildSourceReason(row: SourceHealthRow, runtime: ReturnType<typeof deriveSourceRuntimeState>) {
  if (row.failure_reason) {
    return row.failure_reason;
  }

  if (runtime.runtimeState === "stale") {
    return "Source has not checked in recently.";
  }

  if (runtime.runtimeState === "degraded") {
    return "Source has recent failures.";
  }

  if (row.items_fetched === 0) {
    return "Checked recently; no qualifying stories.";
  }

  return "Source healthy.";
}

function mapStatus(source: SourceDefinition, row?: SourceHealthRow | null): SourceHealthStatus {
  const resolved = row ?? buildFallbackRow(source);
  const runtime = deriveSourceRuntimeState({
    lastCheckedAt: resolved.last_checked_at ?? resolved.last_fetched_at,
    lastSucceededAt: resolved.last_succeeded_at ?? resolved.last_success_at,
    lastFailedAt: resolved.last_failed_at,
    status: resolved.status ?? "idle",
    consecutiveFailures: resolved.consecutive_failures ?? 0,
    expectedIntervalMinutes: source.fetchIntervalMinutes ?? null,
  });

  const lastCheckedAt = resolved.last_checked_at ?? resolved.last_fetched_at;
  const lastSucceededAt = resolved.last_succeeded_at ?? resolved.last_success_at;

  return {
    sourceId: source.id,
    sourceName: resolved.source_name ?? source.name,
    sourceKind: resolved.source_kind ?? source.kind,
    priority: resolved.priority ?? source.priority,
    reliability: Number(resolved.reliability ?? source.reliability),
    status: resolved.status ?? "idle",
    currentStatusReason: buildSourceReason(resolved, runtime),
    failureReason: resolved.failure_reason ?? resolved.last_error,
    consecutiveFailures: resolved.consecutive_failures ?? 0,
    lastCheckedAt,
    lastSucceededAt,
    lastFailedAt: resolved.last_failed_at,
    latestItemPublishedAt: resolved.latest_item_published_at ?? resolved.last_new_item_at,
    lastDurationMs: resolved.last_duration_ms,
    itemsFetched: resolved.items_fetched ?? resolved.last_items_returned ?? 0,
    itemsInserted: resolved.items_inserted ?? resolved.last_items_stored ?? 0,
    itemsUpdated: resolved.items_updated ?? 0,
    duplicatesFiltered: resolved.duplicates_filtered ?? 0,
    invalidRejected: resolved.invalid_rejected ?? 0,
    oldRejected: resolved.old_rejected ?? 0,
    lastNewItemAt: resolved.last_new_item_at,
    stale: runtime.stale,
    degraded: runtime.degraded,
    runtimeState: runtime.runtimeState,
    lastFetchedAt: lastCheckedAt,
    lastSuccessAt: lastSucceededAt,
    lastStatus: mapLegacyStatus(resolved.status ?? "idle", resolved.last_status ?? "idle"),
    lastError: resolved.failure_reason ?? resolved.last_error,
    lastItemsReturned: resolved.items_fetched ?? resolved.last_items_returned ?? 0,
    lastItemsStored:
      (resolved.items_inserted ?? 0) + (resolved.items_updated ?? 0) || resolved.last_items_stored || 0,
  };
}

export async function getSourceHealthRowMap() {
  const client = getSupabaseReadClient();

  if (!client) {
    return new Map<string, SourceHealthRow>();
  }

  const { data, error } = await client.from("source_health").select("*");

  if (error || !data) {
    return new Map<string, SourceHealthRow>();
  }

  return new Map((data as SourceHealthRow[]).map((row) => [row.source_id, row]));
}

export async function upsertSourceHealth(updates: SourceHealthUpdate[], previousRows: Map<string, SourceHealthRow>) {
  const client = getSupabaseServiceClient();

  if (!client || updates.length === 0) {
    return;
  }

  const payload = updates.map(({ source, result, lastNewItemAt }) => {
    const previous = previousRows.get(source.id);
    const succeeded = result.status === "success" || result.status === "partial_success";
    const previousFailures = previous?.consecutive_failures ?? 0;
    const consecutiveFailures = succeeded ? 0 : previousFailures + 1;

    return {
      source_id: source.id,
      source_name: source.name,
      source_kind: source.kind,
      priority: source.priority,
      reliability: source.reliability,
      last_fetched_at: result.completedAt,
      last_success_at: succeeded ? result.completedAt : previous?.last_success_at ?? null,
      last_status: succeeded ? "success" : "error",
      last_error: succeeded ? null : result.error ?? "Unknown ingestion error",
      last_items_returned: result.itemsFetched,
      last_items_stored: result.insertedCount + result.updatedCount,
      last_new_item_at: lastNewItemAt ?? previous?.last_new_item_at ?? null,
      last_checked_at: result.completedAt,
      last_succeeded_at: succeeded ? result.completedAt : previous?.last_succeeded_at ?? previous?.last_success_at ?? null,
      last_failed_at: succeeded ? previous?.last_failed_at ?? null : result.completedAt,
      status: succeeded ? (consecutiveFailures > 0 ? "degraded" : "live") : "error",
      failure_reason: succeeded ? null : result.error ?? "Unknown ingestion error",
      consecutive_failures: consecutiveFailures,
      latest_item_published_at:
        result.latestItemPublishedAt ?? previous?.latest_item_published_at ?? previous?.last_new_item_at ?? null,
      last_duration_ms: result.durationMs,
      items_fetched: result.itemsFetched,
      items_inserted: result.insertedCount,
      items_updated: result.updatedCount,
      duplicates_filtered: result.duplicatesFiltered,
      invalid_rejected: result.invalidRejected,
      old_rejected: result.oldRejected,
      updated_at: result.completedAt,
    };
  });

  const { error } = await client.from("source_health").upsert(payload, { onConflict: "source_id" });

  if (error) {
    throw error;
  }
}

function fallbackPipelineState(nowIso: string): PipelineStateRow {
  const lastSucceededAt =
    sourceHealthSeed
      .map((entry) => entry.lastSucceededAt ?? entry.lastSuccessAt ?? entry.lastFetchedAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? sortedNewsItems[0]?.publishedAt ?? nowIso;

  return {
    pipeline_name: PIPELINE_NAME,
    last_attempted_at:
      sourceHealthSeed
        .map((entry) => entry.lastCheckedAt ?? entry.lastFetchedAt)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? lastSucceededAt,
    last_succeeded_at: lastSucceededAt,
    last_full_success_at: lastSucceededAt,
    last_partial_success_at: null,
    current_status: "live",
    current_status_reason: "Seed health snapshot",
    consecutive_failures: 0,
    active_run_id: null,
    active_run_started_at: null,
    lock_owner: null,
    lock_acquired_at: null,
    lock_expires_at: null,
    last_run_duration_ms: null,
    updated_at: nowIso,
  };
}

export async function getSourceHealthSnapshot(sourceRegistry: SourceDefinition[]): Promise<SourceHealthSnapshot> {
  const nowIso = new Date().toISOString();
  const fallbackLatestPublishedAt = sortedNewsItems[0]?.publishedAt ?? seedNow.toISOString();

  if (!isSupabaseReadConfigured()) {
    const sources = sourceRegistry.map((source) => mapStatus(source, buildFallbackRow(source)));
    const pipeline = fallbackPipelineState(nowIso);

    return {
      configured: false,
      pipelineName: PIPELINE_NAME,
      generatedAt: nowIso,
      currentStatus: "DEGRADED",
      currentStatusReason: "Preview data — live ingestion is not configured in this environment.",
      quietFeed: false,
      delayed: false,
      degraded: false,
      staleData: false,
      lastAttemptedAt: pipeline.last_attempted_at,
      lastSucceededAt: pipeline.last_succeeded_at,
      lastFullSuccessAt: pipeline.last_full_success_at,
      lastPartialSuccessAt: pipeline.last_partial_success_at,
      latestPublishedAt: fallbackLatestPublishedAt,
      lastIngestionAt: pipeline.last_succeeded_at ?? fallbackLatestPublishedAt,
      consecutiveFailures: pipeline.consecutive_failures,
      sourceSummary: {
        total: sources.length,
        healthy: sources.filter((source) => !source.stale && !source.degraded).length,
        degraded: sources.filter((source) => source.degraded).length,
        stale: sources.filter((source) => source.stale).length,
      },
      recentRuns: [],
      sources,
    };
  }

  const client = getSupabaseReadClient();

  if (!client) {
    throw new Error("Supabase read client is unavailable.");
  }

  let rowsResult: { data: SourceHealthRow[] | null; error: unknown | null };
  let latestNewsResult: { data: Array<{ published_at: string }> | null; error: unknown | null };
  let pipelineState: PipelineStateRow | null;
  let recentRuns: Awaited<ReturnType<typeof getRecentRunSummaries>>;

  try {
    [rowsResult, latestNewsResult, pipelineState, recentRuns] = await Promise.all([
      client.from("source_health").select("*"),
      client.from("news_items").select("published_at").order("published_at", { ascending: false }).limit(1),
      getPipelineStateRow(),
      getRecentRunSummaries(12),
    ]);
  } catch {
    rowsResult = { data: [], error: null };
    latestNewsResult = { data: [{ published_at: fallbackLatestPublishedAt }], error: null };
    pipelineState = fallbackPipelineState(nowIso);
    recentRuns = [];
  }

  const rows = rowsResult.error || !rowsResult.data ? [] : (rowsResult.data as SourceHealthRow[]);
  const rowMap = new Map(rows.map((row) => [row.source_id, row]));
  const sources = sourceRegistry.map((source) => mapStatus(source, rowMap.get(source.id) ?? buildFallbackRow(source)));
  const sourceConfigById = new Map(sourceRegistry.map((source) => [source.id, source]));
  const latestPublishedAt = latestNewsResult.error
    ? fallbackLatestPublishedAt
    : latestNewsResult.data?.[0]?.published_at ?? fallbackLatestPublishedAt;
  const resolvedPipelineState = pipelineState ?? fallbackPipelineState(nowIso);
  const sourceStates = sources.map((source) =>
    deriveSourceRuntimeState({
      lastCheckedAt: source.lastCheckedAt,
      lastSucceededAt: source.lastSucceededAt,
      lastFailedAt: source.lastFailedAt,
      status: source.status,
      consecutiveFailures: source.consecutiveFailures,
      expectedIntervalMinutes: sourceConfigById.get(source.sourceId)?.fetchIntervalMinutes ?? null,
    }),
  );
  const derived = derivePipelineHealthState(
    {
      lastAttemptedAt: resolvedPipelineState.last_attempted_at,
      lastSucceededAt: resolvedPipelineState.last_succeeded_at,
      activeRunStartedAt: resolvedPipelineState.active_run_started_at,
      consecutiveFailures: resolvedPipelineState.consecutive_failures,
      sourceStates,
      latestPublishedAt,
    },
    new Date(nowIso),
  );

  return {
    configured: true,
    pipelineName: PIPELINE_NAME,
    generatedAt: nowIso,
    currentStatus: derived.state,
    currentStatusReason: derived.reason,
    quietFeed: derived.quietFeed,
    delayed: derived.state === "DELAYED",
    degraded: derived.state === "DEGRADED",
    staleData: derived.state === "STALE",
    lastAttemptedAt: resolvedPipelineState.last_attempted_at,
    lastSucceededAt: resolvedPipelineState.last_succeeded_at,
    lastFullSuccessAt: resolvedPipelineState.last_full_success_at,
    lastPartialSuccessAt: resolvedPipelineState.last_partial_success_at,
    latestPublishedAt,
    lastIngestionAt: resolvedPipelineState.last_succeeded_at ?? resolvedPipelineState.last_attempted_at ?? latestPublishedAt,
    consecutiveFailures: resolvedPipelineState.consecutive_failures,
    sourceSummary: {
      total: sources.length,
      healthy: sources.filter((source) => !source.stale && !source.degraded).length,
      degraded: sources.filter((source) => source.degraded).length,
      stale: sources.filter((source) => source.stale).length,
    },
    recentRuns,
    sources,
  };
}
