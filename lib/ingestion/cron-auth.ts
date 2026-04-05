export function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const vercelHeader = request.headers.get("x-vercel-cron");

  if (vercelHeader) {
    return true;
  }

  if (process.env.NODE_ENV === "development" && !cronSecret) {
    return true;
  }

  if (!cronSecret) {
    return false;
  }

  return authorization === `Bearer ${cronSecret}`;
}
