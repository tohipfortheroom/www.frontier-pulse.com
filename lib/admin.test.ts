import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdminRequestAuthorized } from "@/lib/admin";

const ORIGINAL_ENV = {
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_ENABLED: process.env.ADMIN_ENABLED,
};

afterEach(() => {
  process.env.ADMIN_SECRET = ORIGINAL_ENV.ADMIN_SECRET;
  process.env.CRON_SECRET = ORIGINAL_ENV.CRON_SECRET;
  process.env.ADMIN_ENABLED = ORIGINAL_ENV.ADMIN_ENABLED;
  vi.unstubAllGlobals();
});

describe("isAdminRequestAuthorized", () => {
  it("allows same-origin admin UI posts even when a secret is configured", () => {
    process.env.ADMIN_SECRET = "top-secret";
    process.env.ADMIN_ENABLED = "true";

    const request = new Request("https://frontierpulse.ai/api/admin/ingest", {
      method: "POST",
      headers: {
        origin: "https://frontierpulse.ai",
        "sec-fetch-site": "same-origin",
      },
    });

    expect(isAdminRequestAuthorized(request)).toBe(true);
  });

  it("still accepts bearer auth for non-browser callers", () => {
    process.env.ADMIN_SECRET = "top-secret";

    const request = new Request("https://frontierpulse.ai/api/admin/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer top-secret",
      },
    });

    expect(isAdminRequestAuthorized(request)).toBe(true);
  });

  it("rejects cross-site requests without the configured secret", () => {
    process.env.ADMIN_SECRET = "top-secret";
    process.env.ADMIN_ENABLED = "true";

    const request = new Request("https://frontierpulse.ai/api/admin/ingest", {
      method: "POST",
      headers: {
        origin: "https://example.com",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(isAdminRequestAuthorized(request)).toBe(false);
  });
});
