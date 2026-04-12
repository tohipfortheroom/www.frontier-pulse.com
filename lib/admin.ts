export function isAdminEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ADMIN_ENABLED === "true";
}

export function isAdminRequestAuthorized(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

  if (!adminSecret) {
    return true;
  }

  const authorization = request.headers.get("authorization");

  if (authorization === `Bearer ${adminSecret}`) {
    return true;
  }

  if (!isAdminEnabled()) {
    return false;
  }

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestOrigin = new URL(request.url).origin;

  return Boolean(origin && origin === requestOrigin && (fetchSite === "same-origin" || fetchSite === "same-site"));
}
