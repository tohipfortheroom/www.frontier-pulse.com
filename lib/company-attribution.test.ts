import { describe, expect, it } from "vitest";

import { filterCompanySlugsByStoryContext, inferPrimaryCompanySlug, rankCompanySlugsByStoryContext } from "@/lib/company-attribution";

describe("rankCompanySlugsByStoryContext", () => {
  it("prioritizes the company that dominates the headline and body", () => {
    expect(
      rankCompanySlugsByStoryContext(["openai", "google-deepmind"], {
        headline: "Google DeepMind expands Gemini 3.0 Ultra enterprise rollout",
        body: "Google said Gemini 3.0 Ultra is now available to enterprise customers through Google Cloud.",
        sourceName: "The Information",
      }),
    ).toEqual(["google-deepmind", "openai"]);
  });

  it("respects an official company hint when one exists", () => {
    expect(
      rankCompanySlugsByStoryContext(["anthropic", "amazon-aws-ai"], {
        headline: "Claude adds Bedrock deployment controls for regulated teams",
        body: "Anthropic said the update expands Claude deployment options on Amazon Bedrock.",
        sourceName: "Anthropic News",
        sourceUrl: "https://www.anthropic.com/news/claude-bedrock-controls",
        companyHint: "anthropic",
      }),
    ).toEqual(["anthropic", "amazon-aws-ai"]);
  });

  it("keeps multi-company associations while choosing the obvious primary company", () => {
    expect(
      rankCompanySlugsByStoryContext(["openai", "nvidia", "amazon-aws-ai"], {
        headline: "Amazon launches Nova Reasoning models on Bedrock",
        body: "AWS said the new Nova Reasoning release is available today on Amazon Bedrock for enterprise buyers.",
        sourceName: "Reuters",
      }),
    ).toEqual(["amazon-aws-ai", "openai", "nvidia"]);
  });

  it("drops weak incidental company matches when one company clearly dominates the story", () => {
    expect(
      filterCompanySlugsByStoryContext(["openai", "microsoft-ai", "nvidia"], {
        headline: "OpenAI expands enterprise identity controls for ChatGPT admins",
        body: "OpenAI said the update adds admin controls and audit tooling for ChatGPT Enterprise customers.",
        sourceName: "OpenAI News",
        sourceUrl: "https://openai.com/news/enterprise-admin-controls",
        companyHint: "openai",
      }),
    ).toEqual(["openai"]);
  });

  it("keeps explicit multi-company stories when both companies have strong evidence", () => {
    expect(
      filterCompanySlugsByStoryContext(["openai", "microsoft-ai"], {
        headline: "OpenAI and Microsoft expand Azure capacity for enterprise ChatGPT workloads",
        body: "OpenAI and Microsoft said Azure capacity is expanding to support more ChatGPT Enterprise and API demand.",
        sourceName: "Reuters",
      }),
    ).toEqual(["openai", "microsoft-ai"]);
  });

  it("infers a missing tracked company when the headline makes it obvious", () => {
    expect(
      inferPrimaryCompanySlug({
        headline: "Meta pauses work with Mercor after data breach review",
        body: "Meta halted the Mercor engagement while it investigates how candidate data was exposed.",
        sourceName: "The Information",
      }),
    ).toBe("meta-ai");
  });

  it("does not force a tracked company onto unrelated industry stories", () => {
    expect(
      inferPrimaryCompanySlug({
        headline: "OpenClaw gives users yet another reason to be freaked out about security",
        body: "The Ars Technica piece covers an open-source project and a new security risk.",
        sourceName: "Ars Technica",
      }),
    ).toBeNull();
  });
});
