import type { CompanyCardRecord } from "@/lib/db/types";
import { companies } from "@/lib/seed/data";
import { hasMeaningfulMetric } from "@/lib/utils";

export const trackedCompanies = companies;
export const TRACKED_COMPANY_COUNT = trackedCompanies.length;

export function getTrackedCompanySummary(records?: CompanyCardRecord[]) {
  const trackedCount = records?.length ?? TRACKED_COMPANY_COUNT;
  const rankedCount =
    records?.filter((record) => Boolean(record.momentum && hasMeaningfulMetric(record.momentum.score))).length ?? 10;

  return {
    trackedCount,
    rankedCount,
    rankingSurfaceCount: Math.min(rankedCount, 10),
  };
}
