import { randomUUID } from "node:crypto";

import { getSupabaseReadClient, getSupabaseServiceClient } from "../db/client.ts";
import { PIPELINE_NAME, PIPELINE_RUNTIME_CONFIG } from "./config.ts";
import type { PipelineHealthState } from "./health-model.ts";
import type { IngestionRunSummary, PipelineRunStatus, PipelineTriggerKind, SourceRunResult } from "./types.ts";

export type PipelineStateRow = {
  pipeline_name: string;
  last_attempted_at: string | null;
  last_succeeded_at: string | null;
  last_full_success_at: string | null;
  last_partial_success_at: string | null;
  current_status: string;
  current_status_reason: string | null;
  consecutive_failures: number;
  active_run_id: string | null;
  active_run_started_at: string | null;
  lock_owner: string | null;
  lock_acquired_at: string | null;
  lock_expires_at: string | null;
  last_run_duration_ms: number | null;
  updated_at: string;
};

type BeginRunOptions = {
  triggerKind: PipelineTriggerKind;
  targetScope: string;
  sourceCount: number;
  dryRun: boolean;
};

export type RunContext = {
  runId: string;
  pipelineName: string;
  triggerKind: PipelineTriggerKind;
  targetScope: string;
  startedAt: string;
  dryRun: boolean;
  lockOwner: string | null;
  lockAcquired: boolean;
  overlapPrevented: boolean;
};

function getLockOwner() {
  return `codex-${process.pid}-${randomUUID().slice(0, 8)}`;
}

function mapRunStatusToHealthStatus(status: PipelineRunStatus): PipelineHealthState | "running" {
  switch (status) {
    case "success":
      return "LIVE";
    case "partial_success":
      return "DEGRADED";
    case "error":
      return "STALE";
    case "skipped":
    default:
      return "DELAYED";
  }
}

export async function beginPipelineRun(options: BeginRunOptions): Promise<RunContext> {
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const client = getSupabaseServiceClient();

  if (!client || options.dryRun) {
    return {
      runId,
      pipelineName: PIPELINE_NAME,
      triggerKind: options.triggerKind,
      targetScope: options.targetScope,
      startedAt,
      dryRun: true,
      lockOwner: null,
      lockAcquired: true,
      overlapPrevented: false,
    };
  }

  const lockOwner = getLockOwner();
  const { data: lockAcquired, error: lockError } = await client.rpc("acquire_pipeline_lock", {
    p_pipeline_name: PIPELINE_NAME,
    p_owner: lockOwner,
    p_run_id: runId,
    p_ttl_seconds: PIPELINE_RUNTIME_CONFIG.runLockTtlSeconds,
  });

  if (lockError) {
    throw lockError;
  }

  if (!lockAcquired) {
    const { error: skippedRunError } = await client.from("ingestion_runs").insert({
      id: runId,
      pipeline_name: PIPELINE_NAME,
      trigger_kind: options.triggerKind,
      target_scope: options.targetScope,
      status: "skipped",
      status_reason: "Another ingestion run is already in progress.",
      started_at: startedAt,
      completed_at: startedAt,
      duration_ms: 0,
      source_count: options.sourceCount,
      dry_run: false,
    });

    if (skippedRunError) {
      throw skippedRunError;
    }

    return {
      runId,
      pipelineName: PIPELINE_NAME,
      triggerKind: options.triggerKind,
      targetScope: options.targetScope,
      startedAt,
      dryRun: false,
      lockOwner,
      lockAcquired: false,
      overlapPrevented: true,
    };
  }

  const { error: runningRunError } = await client.from("ingestion_runs").insert({
    id: runId,
    pipeline_name: PIPELINE_NAME,
    trigger_kind: options.triggerKind,
    target_scope: options.targetScope,
    status: "running",
    status_reason: "Ingestion run in progress.",
    started_at: startedAt,
    source_count: options.sourceCount,
    dry_run: false,
  });

  if (runningRunError) {
    throw runningRunError;
  }

  const { error: pipelineStateError } = await client
    .from("pipeline_state")
    .upsert(
      {
        pipeline_name: PIPELINE_NAME,
        last_attempted_at: startedAt,
        current_status: "running",
        current_status_reason: "Ingestion run in progress.",
        active_run_id: runId,
        active_run_started_at: startedAt,
        lock_owner: lockOwner,
        lock_acquired_at: startedAt,
      },
      { onConflict: "pipeline_name" },
    );

  if (pipelineStateError) {
    throw pipelineStateError;
  }

  return {
    runId,
    pipelineName: PIPELINE_NAME,
    triggerKind: options.triggerKind,
    targetScope: options.targetScope,
    startedAt,
    dryRun: false,
    lockOwner,
    lockAcquired: true,
    overlapPrevented: false,
  };
}

export async function recordSourceRun(runContext: RunContext, result: SourceRunResult) {
  const client = getSupabaseServiceClient();

  if (!client || runContext.dryRun || !runContext.lockAcquired) {
    return;
  }

  const { error } = await client.from("ingestion_run_sources").upsert(
    {
      run_id: runContext.runId,
      source_id: result.sourceId,
      source_name: result.sourceName,
      source_kind: result.sourceKind,
      priority: result.priority,
      reliability: result.reliability,
      status: result.status,
      attempted_at: result.attemptedAt,
      completed_at: result.completedAt,
      duration_ms: result.durationMs,
      items_fetched: result.itemsFetched,
      accepted_count: result.acceptedCount,
      inserted_count: result.insertedCount,
      updated_count: result.updatedCount,
      duplicates_filtered: result.duplicatesFiltered,
      invalid_rejected: result.invalidRejected,
      old_rejected: result.oldRejected,
      latest_item_published_at: result.latestItemPublishedAt,
      error_message: result.error,
    },
    { onConflict: "run_id,source_id" },
  );

  if (error) {
    throw error;
  }
}

type CompleteRunOptions = {
  context: RunContext;
  status: PipelineRunStatus;
  statusReason: string;
  completedAt: string;
  durationMs: number;
  sourceCount: number;
  sourceSuccessCount: number;
  sourceFailureCount: number;
  fetchedCount: number;
  normalizedCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicatesFiltered: number;
  invalidRejected: number;
  oldRejected: number;
  errors: string[];
};

export async function completePipelineRun(options: CompleteRunOptions) {
  const client = getSupabaseServiceClient();

  if (!client || options.context.dryRun) {
    return;
  }

  try {
    const { error: runUpdateError } = await client
      .from("ingestion_runs")
      .update({
        status: options.status,
        status_reason: options.statusReason,
        completed_at: options.completedAt,
        duration_ms: options.durationMs,
        source_count: options.sourceCount,
        source_success_count: options.sourceSuccessCount,
        source_failure_count: options.sourceFailureCount,
        fetched_count: options.fetchedCount,
        normalized_count: options.normalizedCount,
        inserted_count: options.insertedCount,
        updated_count: options.updatedCount,
        duplicates_filtered: options.duplicatesFiltered,
        invalid_rejected: options.invalidRejected,
        old_rejected: options.oldRejected,
        error_count: options.errors.length,
        error_summary: options.errors.length > 0 ? options.errors.slice(0, 10) : null,
      })
      .eq("id", options.context.runId);

    if (runUpdateError) {
      throw runUpdateError;
    }

    const { data: stateRow } = await client
      .from("pipeline_state")
      .select("*")
      .eq("pipeline_name", PIPELINE_NAME)
      .maybeSingle<PipelineStateRow>();

    const previousFailures = stateRow?.consecutive_failures ?? 0;
    const nextFailures = options.status === "error" ? previousFailures + 1 : 0;

    const { error: pipelineUpdateError } = await client
      .from("pipeline_state")
      .upsert(
        {
          pipeline_name: PIPELINE_NAME,
          last_attempted_at: options.context.startedAt,
          last_succeeded_at:
            options.status === "success" || options.status === "partial_success"
              ? options.completedAt
              : stateRow?.last_succeeded_at ?? null,
          last_full_success_at:
            options.status === "success" ? options.completedAt : stateRow?.last_full_success_at ?? null,
          last_partial_success_at:
            options.status === "partial_success" ? options.completedAt : stateRow?.last_partial_success_at ?? null,
          current_status: mapRunStatusToHealthStatus(options.status).toLowerCase(),
          current_status_reason: options.statusReason,
          consecutive_failures: nextFailures,
          active_run_id: null,
          active_run_started_at: null,
          lock_owner: null,
          lock_acquired_at: null,
          lock_expires_at: null,
          last_run_duration_ms: options.durationMs,
        },
        { onConflict: "pipeline_name" },
      );

    if (pipelineUpdateError) {
      throw pipelineUpdateError;
    }
  } finally {
    if (options.context.lockOwner) {
      const { error: releaseError } = await client.rpc("release_pipeline_lock", {
        p_pipeline_name: PIPELINE_NAME,
        p_owner: options.context.lockOwner,
      });

      if (releaseError) {
        throw releaseError;
      }
    }
  }
}

export async function getPipelineStateRow() {
  const client = getSupabaseReadClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("pipeline_state")
    .select("*")
    .eq("pipeline_name", PIPELINE_NAME)
    .maybeSingle<PipelineStateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getRecentRunSummaries(limit = 10): Promise<IngestionRunSummary[]> {
  const client = getSupabaseReadClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("ingestion_runs")
    .select("*")
    .eq("pipeline_name", PIPELINE_NAME)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    runId: row.id,
    pipelineName: row.pipeline_name,
    triggerKind: row.trigger_kind,
    targetScope: row.target_scope,
    status: row.status,
    statusReason: row.status_reason,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    sourceCount: row.source_count,
    sourceSuccessCount: row.source_success_count,
    sourceFailureCount: row.source_failure_count,
    fetchedCount: row.fetched_count,
    normalizedCount: row.normalized_count,
    insertedCount: row.inserted_count,
    updatedCount: row.updated_count,
    duplicatesFiltered: row.duplicates_filtered,
    invalidRejected: row.invalid_rejected,
    oldRejected: row.old_rejected,
    errorCount: row.error_count,
    dryRun: row.dry_run,
  })) as IngestionRunSummary[];
}
