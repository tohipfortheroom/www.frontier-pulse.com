import { unstable_cache } from "next/cache";

import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/monitoring/logger";

type LogModule = Parameters<typeof logger.info>[0];

type CacheOptions<TArgs extends unknown[]> = {
  key: string;
  revalidate: number;
  tags?: string[];
  module?: LogModule;
  describeArgs?: (...args: TArgs) => Record<string, unknown>;
};

export const CACHE_TAGS = {
  health: "health-surface",
  siteContent: "site-content",
} as const;

export function createInstrumentedCache<TArgs extends unknown[], TResult>(
  label: string,
  loader: (...args: TArgs) => Promise<TResult>,
  options: CacheOptions<TArgs>,
) {
  const logModule = options.module ?? "ui";
  const cachedLoader = unstable_cache(
    async (...args: TArgs) => {
      const startedAt = Date.now();
      const metadata = {
        cacheKey: options.key,
        revalidateSeconds: options.revalidate,
        ...(options.describeArgs?.(...args) ?? {}),
      };

      logger.info(logModule, `${label}_cache_miss`, metadata);

      try {
        const result = await loader(...args);

        logger.info(logModule, `${label}_compute_complete`, {
          ...metadata,
          durationMs: Date.now() - startedAt,
        });

        return result;
      } catch (error) {
        logger.error(logModule, `${label}_compute_failed`, {
          ...metadata,
          durationMs: Date.now() - startedAt,
          error: getErrorMessage(error),
        });
        throw error;
      }
    },
    [options.key],
    {
      revalidate: options.revalidate,
      tags: options.tags,
    },
  );

  return async (...args: TArgs): Promise<TResult> => {
    const startedAt = Date.now();
    const result = await cachedLoader(...args);

    if (process.env.NODE_ENV !== "production" || process.env.LOG_CACHE_READS === "true") {
      logger.debug(logModule, `${label}_cache_read`, {
        cacheKey: options.key,
        durationMs: Date.now() - startedAt,
        ...(options.describeArgs?.(...args) ?? {}),
      });
    }

    return result;
  };
}
