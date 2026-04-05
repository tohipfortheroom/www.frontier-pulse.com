import { PIPELINE_RUNTIME_CONFIG } from "./config.ts";
import type { SourceDefinition } from "./types.ts";

type SourceFetchOptions = {
  source?: SourceDefinition;
  label: string;
  init?: RequestInit;
  timeoutMs?: number;
  retries?: number;
};

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function getUserAgent() {
  return `FrontierPulseBot/1.0 (+${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"})`;
}

async function fetchWithTimeout(input: RequestInfo | URL, options: SourceFetchOptions) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? options.source?.requestTimeoutMs ?? PIPELINE_RUNTIME_CONFIG.requestTimeoutMs;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...(options.init ?? {}),
      signal: controller.signal,
      headers: {
        "User-Agent": getUserAgent(),
        ...(options.init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`${options.label} failed with status ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${options.label} timed out after ${timeoutMs}ms`);
    }

    throw error instanceof Error ? error : new Error(`${options.label} failed`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSourceText(input: RequestInfo | URL, options: SourceFetchOptions) {
  const retries = options.retries ?? options.source?.requestRetries ?? PIPELINE_RUNTIME_CONFIG.requestRetries;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, options);
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`${options.label} failed`);

      if (attempt < retries) {
        await sleep(Math.min(4_000, 600 * 2 ** attempt));
      }
    }
  }

  throw lastError ?? new Error(`${options.label} failed`);
}

export async function fetchSourceJson<T>(input: RequestInfo | URL, options: SourceFetchOptions) {
  const retries = options.retries ?? options.source?.requestRetries ?? PIPELINE_RUNTIME_CONFIG.requestRetries;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, options);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`${options.label} failed`);

      if (attempt < retries) {
        await sleep(Math.min(4_000, 600 * 2 ** attempt));
      }
    }
  }

  throw lastError ?? new Error(`${options.label} failed`);
}
