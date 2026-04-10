import { afterEach, describe, expect, it } from "vitest";

import { getSocialLinks } from "@/lib/site-config";

const originalX = process.env.NEXT_PUBLIC_X_URL;
const originalTwitter = process.env.NEXT_PUBLIC_TWITTER_URL;
const originalGithub = process.env.NEXT_PUBLIC_GITHUB_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_X_URL = originalX;
  process.env.NEXT_PUBLIC_TWITTER_URL = originalTwitter;
  process.env.NEXT_PUBLIC_GITHUB_URL = originalGithub;
});

describe("getSocialLinks", () => {
  it("hides placeholder destinations", () => {
    process.env.NEXT_PUBLIC_X_URL = "https://x.com";
    process.env.NEXT_PUBLIC_GITHUB_URL = "https://github.com";

    expect(getSocialLinks()).toEqual({
      x: null,
      github: null,
    });
  });

  it("returns configured project links", () => {
    process.env.NEXT_PUBLIC_X_URL = "https://x.com/frontierpulse";
    process.env.NEXT_PUBLIC_GITHUB_URL = "https://github.com/tohipfortheroom/www.frontier-pulse.com";

    expect(getSocialLinks()).toEqual({
      x: "https://x.com/frontierpulse",
      github: "https://github.com/tohipfortheroom/www.frontier-pulse.com",
    });
  });
});
