type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number;
};

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: FetchWithTimeoutInit = {}) {
  const { timeoutMs = 10_000, signal, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

type FetchJsonOptions = FetchWithTimeoutInit & {
  retries?: number;
  retryDelayMs?: number;
  allowNonOk?: boolean;
};

export async function fetchJsonWithRetry<T>(input: RequestInfo | URL, options: FetchJsonOptions = {}) {
  const { retries = 0, retryDelayMs = 2_000, allowNonOk = false, ...rest } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, rest);

      if (!response.ok && !allowNonOk) {
        throw new Error(`Request failed with status ${response.status}.`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed.");

      if (attempt < retries) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError ?? new Error("Request failed.");
}
