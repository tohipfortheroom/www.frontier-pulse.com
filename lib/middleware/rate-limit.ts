type RateLimitBucket = {
  timestamps: number[];
};

type RateLimitOptions = {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getBucketId(namespace: string, key: string) {
  return `${namespace}:${key}`;
}

function prune(bucket: RateLimitBucket, cutoff: number) {
  bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > cutoff);
}

export function getRequestIdentity(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "local";
}

export function enforceRateLimit({ namespace, key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucketId = getBucketId(namespace, key);
  const bucket = buckets.get(bucketId) ?? { timestamps: [] };
  prune(bucket, cutoff);

  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = Math.max(1_000, windowMs - (now - bucket.timestamps[0]));

    return {
      ok: false as const,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(bucketId, bucket);

  return {
    ok: true as const,
    retryAfterSeconds: 0,
  };
}
