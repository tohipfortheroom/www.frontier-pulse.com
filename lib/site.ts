function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

const CANONICAL_SITE_URL = "https://frontier-pulse.com";

function formatEnvUrl(value: string | undefined) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return normalizeSiteUrl(value);
  }

  return normalizeSiteUrl(`https://${value}`);
}

export function getSiteUrl() {
  const configuredUrl = formatEnvUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );

  if (configuredUrl && !configuredUrl.endsWith(".vercel.app")) {
    return configuredUrl;
  }

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : CANONICAL_SITE_URL;
}

export function getSiteUrlFromRequest(request: Request) {
  const requestOrigin = normalizeSiteUrl(new URL(request.url).origin);

  if (requestOrigin.endsWith(".vercel.app")) {
    return getSiteUrl();
  }

  return requestOrigin;
}
