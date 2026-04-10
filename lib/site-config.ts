function normalizeExternalUrl(value: string | undefined) {
  const input = value?.trim();

  if (!input) {
    return null;
  }

  try {
    const url = new URL(input);

    if (!/^https?:$/.test(url.protocol)) {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");

    if ((hostname === "x.com" || hostname === "twitter.com" || hostname === "github.com") && (!path || path === "")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getSocialLinks() {
  return {
    x: normalizeExternalUrl(process.env.NEXT_PUBLIC_X_URL ?? process.env.NEXT_PUBLIC_TWITTER_URL),
    github: normalizeExternalUrl(process.env.NEXT_PUBLIC_GITHUB_URL),
  };
}
