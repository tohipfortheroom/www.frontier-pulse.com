function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export function getSiteUrlFromRequest(request: Request) {
  return normalizeSiteUrl(new URL(request.url).origin);
}
