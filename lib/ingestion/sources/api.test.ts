import { describe, expect, it } from "vitest";

import { shouldKeepHackerNewsHit } from "./api.ts";

describe("shouldKeepHackerNewsHit", () => {
  it("drops generic Show HN github projects without explicit tracked-company signal", () => {
    expect(
      shouldKeepHackerNewsHit(
        {
          title: "Show HN: Frontend-VisualQA",
          story_text: "A GitHub tool for automated visual QA across frontend apps.",
          url: "https://github.com/example/frontend-visualqa",
        },
        ["ai", "artificial intelligence"],
      ),
    ).toBe(false);
  });

  it("drops Show HN client libraries even when they mention model tooling", () => {
    expect(
      shouldKeepHackerNewsHit(
        {
          title: "Show HN: Ollama-client-rs",
          story_text: "A Rust client library for Ollama and local models.",
          url: "https://github.com/example/ollama-client-rs",
        },
        ["ai", "ollama"],
      ),
    ).toBe(false);
  });

  it("keeps hacker news stories when a tracked company is the obvious subject", () => {
    expect(
      shouldKeepHackerNewsHit(
        {
          title: "OpenAI rolls out GPT-5 controls for enterprise admins",
          story_text: "The post discusses a concrete OpenAI enterprise rollout and pricing change.",
          url: "https://news.ycombinator.com/item?id=1234",
        },
        ["openai", "gpt-5", "enterprise"],
      ),
    ).toBe(true);
  });
});
