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

  it("drops weak seeded company associations when the story text does not support them", () => {
    expect(
      filterCompanySlugsByStoryContext(
        ["openai", "meta-ai"],
        {
          headline: "Your article about AI doesn’t need AI art",
          body: "The piece argues that publications should stop pairing every AI story with synthetic illustrations.",
          sourceName: "The New Yorker",
        },
      ),
    ).toEqual([]);
  });

  it("keeps strategic shared-company stories capped to the most relevant companies", () => {
    expect(
      filterCompanySlugsByStoryContext(
        ["anthropic", "amazon-aws-ai", "openai"],
        {
          headline: "Anthropic expands Claude deployment controls on Amazon Bedrock",
          body: "Anthropic said the update gives Bedrock customers more deployment controls for Claude in regulated environments.",
          sourceName: "Anthropic News",
          sourceUrl: "https://www.anthropic.com/news/claude-bedrock-controls",
          companyHint: "anthropic",
        },
        { maxCompanies: 2 },
      ),
    ).toEqual(["anthropic", "amazon-aws-ai"]);
  });
});
