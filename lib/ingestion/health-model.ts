import { differenceInMinutes } from "date-fns";

import { PIPELINE_HEALTH_CONFIG } from "./config.ts";

export type PipelineHealthState = "LIVE" | "DELAYED" | "DEGRADED" | "STALE";
export type SourceRuntimeState = "healthy" | "degraded" | "stale" | "error" | "idle";

type SourceRuntimeInput = {
  lastCheckedAt: string | null;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  status: string;
  consecutiveFailures: number;
};

type PipelineRuntimeInput = {
  lastAttemptedAt: string | null;
  lastSucceededAt: string | null;
  activeRunStartedAt: string | null;
  consecutiveFailures: number;
};

export function deriveSourceRuntimeState(input: SourceRuntimeInput, now = new Date()) {
  const minutesSinceCheck = input.lastCheckedAt ? differenceInMinutes(now, new Date(input.lastCheckedAt)) : null;
  const minutesSinceSuccess = input.lastSucceededAt ? differenceInMinutes(now, new Date(input.lastSucceededAt)) : null;
  const recentFailure = input.lastFailedAt ? differenceInMinutes(now, new Date(input.lastFailedAt)) : null;

  const stale =
    minutesSinceCheck === null || minutesSinceCheck >= PIPELINE_HEALTH_CONFIG.sourceStaleAfterMinutes;
  const degraded =
    !stale &&
    (input.status === "error" ||
      input.status === "degraded" ||
      input.consecutiveFailures >= PIPELINE_HEALTH_CONFIG.maxConsecutiveFailuresBeforeDegraded ||
      (recentFailure !== null && recentFailure <= PIPELINE_HEALTH_CONFIG.sourceDegradedAfterMinutes) ||
      (minutesSinceSuccess !== null && minutesSinceSuccess >= PIPELINE_HEALTH_CONFIG.sourceDegradedAfterMinutes));

  let runtimeState: SourceRuntimeState;

  if (!input.lastCheckedAt && input.status === "idle") {
    runtimeState = "idle";
  } else if (input.status === "error") {
    runtimeState = stale ? "stale" : "error";
  } else if (stale) {
    runtimeState = "stale";
  } else if (degraded) {
    runtimeState = "degraded";
  } else {
    runtimeState = "healthy";
  }

  return {
    runtimeState,
    stale,
    degraded,
    minutesSinceCheck,
    minutesSinceSuccess,
  };
}

export function derivePipelineHealthState(
  input: PipelineRuntimeInput & {
    sourceStates: Array<ReturnType<typeof deriveSourceRuntimeState>>;
    latestPublishedAt: string | null;
  },
  now = new Date(),
) {
  const minutesSinceAttempt = input.lastAttemptedAt ? differenceInMinutes(now, new Date(input.lastAttemptedAt)) : null;
  const minutesSinceSuccess = input.lastSucceededAt ? differenceInMinutes(now, new Date(input.lastSucceededAt)) : null;
  const activeRunAge = input.activeRunStartedAt ? differenceInMinutes(now, new Date(input.activeRunStartedAt)) : null;
  const quietFeed =
    input.latestPublishedAt !== null &&
    differenceInMinutes(now, new Date(input.latestPublishedAt)) >= PIPELINE_HEALTH_CONFIG.quietFeedAfterMinutes;

  const degradedSources = input.sourceStates.filter((source) => source.degraded).length;
  const staleSources = input.sourceStates.filter((source) => source.stale).length;
  const totalSources = input.sourceStates.length;
  const allSourcesStale = totalSources > 0 && staleSources === totalSources;
  const anySourcesDegraded = degradedSources > 0;

  let state: PipelineHealthState;
  let reason: string;

  if (minutesSinceAttempt === null && minutesSinceSuccess === null) {
    state = "STALE";
    reason = "Feed stale — pipeline has not completed an ingestion run yet.";
  } else if (allSourcesStale || (minutesSinceSuccess !== null && minutesSinceSuccess >= PIPELINE_HEALTH_CONFIG.staleAfterMinutes)) {
    state = "STALE";
    reason = "Feed stale — pipeline needs attention.";
  } else if (
    input.consecutiveFailures >= PIPELINE_HEALTH_CONFIG.maxConsecutiveFailuresBeforeDegraded ||
    anySourcesDegraded
  ) {
    state = "DEGRADED";
    reason =
      degradedSources > 0
        ? `Some sources degraded (${degradedSources}/${totalSources}).`
        : "Pipeline degraded — recent failures need attention.";
  } else if (
    (minutesSinceAttempt !== null && minutesSinceAttempt >= PIPELINE_HEALTH_CONFIG.delayedAfterMinutes) ||
    (minutesSinceSuccess !== null && minutesSinceSuccess >= PIPELINE_HEALTH_CONFIG.delayedAfterMinutes)
  ) {
    state = "DELAYED";
    reason = "Ingestion delayed — retrying automatically.";
  } else {
    state = "LIVE";

    if (activeRunAge !== null && activeRunAge <= PIPELINE_HEALTH_CONFIG.delayedAfterMinutes) {
      reason = "All systems live — ingestion in progress.";
    } else if (quietFeed) {
      reason = "Sources checked recently; no major new developments.";
    } else {
      reason = "All systems live.";
    }
  }

  return {
    state,
    reason,
    quietFeed,
    degradedSources,
    staleSources,
    totalSources,
    minutesSinceAttempt,
    minutesSinceSuccess,
  };
}
