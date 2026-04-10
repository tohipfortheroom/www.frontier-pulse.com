import { describe, expect, it } from "vitest";

import {
  buildSentenceExcerpt,
  hasUsableExpandedSummary,
  isHighSignalDigestText,
  isGenericWhyItMatters,
  looksLikeCorruptedDigestText,
  looksLikeTruncatedText,
  sanitizeEditorialText,
  selectBestShortSummary,
  selectBestSummary,
  selectBestWhyItMatters,
} from "@/lib/content";

describe("content helpers", () => {
  it("sanitizes html entities and spacing glitches", () => {
    expect(sanitizeEditorialText("T he app was ranking No. 5 &amp; climbing.")).toBe("The app was ranking No. 5 & climbing.");
  });

  it("decodes numeric html entities used by rss feeds", () => {
    expect(sanitizeEditorialText("Google&#8217;s Gemini AI wants to lead &#8216;special projects&#8217;.")).toBe(
      "Google’s Gemini AI wants to lead ‘special projects’.",
    );
  });

  it("detects truncated summaries when a longer cleaned version exists", () => {
    expect(
      looksLikeTruncatedText(
        "The ChatGPT-maker testified in favor of an Illinois bill that would limit when AI labs can be held liable—even in cases",
        "The ChatGPT-maker testified in favor of an Illinois bill that would limit when AI labs can be held liable—even in cases where their products cause critical harm.",
      ),
    ).toBe(true);
  });

  it("prefers cleaned text when the stored summary is clipped", () => {
    expect(
      selectBestSummary({
        summary: "The ChatGPT-maker testified in favor of an Illinois bill that would limit when AI labs can be held liable—even in cases",
        fallbackText:
          "The ChatGPT-maker testified in favor of an Illinois bill that would limit when AI labs can be held liable—even in cases where their products cause critical harm.",
        headline: "OpenAI backs liability bill",
      }),
    ).toBe(
      "The ChatGPT-maker testified in favor of an Illinois bill that would limit when AI labs can be held liable—even in cases where their products cause critical harm.",
    );
  });

  it("builds a short summary from fallback text when the stored one is clipped", () => {
    expect(
      selectBestShortSummary({
        shortSummary: "Meta Superintelligence Labs recently made a significant move by unveiling &#8216;Muse Spark&#8217; — the first model in ",
        summary: "Meta Superintelligence Labs recently made a significant move by unveiling &#8216;Muse Spark&#8217; — the first model in the Muse family.",
        fallbackText:
          "Meta Superintelligence Labs recently made a significant move by unveiling &#8216;Muse Spark&#8217; — the first model in the Muse family. Muse Spark is a natively multimodal reasoning model.",
        headline: "Muse Spark launches",
      }),
    ).toBe("Meta Superintelligence Labs recently made a significant move by unveiling ‘Muse Spark’ — the first model in the Muse family.");
  });

  it("falls through a clipped summary to cleaned source text for short summaries", () => {
    expect(
      selectBestShortSummary({
        shortSummary: "The app was ranking No.",
        summary: "The app was ranking No.",
        fallbackText: "The app was ranking No. 57 on the App Store just before Meta AI's new model launched. Now it's No. 5 — and rising.",
        headline: "Meta AI app climbs to No. 5 on the App Store after Muse Spark launch",
      }),
    ).toBe("The app was ranking No. 57 on the App Store just before Meta AI's new model launched.");
  });

  it("flags corrupted digest copy", () => {
    expect(looksLikeCorruptedDigestText("The app was ranking No.")).toBe(true);
    expect(looksLikeCorruptedDigestText("Launch HN: Freestyle: Sandboxes for AI Coding Agents")).toBe(true);
  });

  it("drops generic why-it-matters boilerplate", () => {
    expect(
      selectBestWhyItMatters({
        whyItMatters: "This matters because it changes how the market reads current momentum, execution quality, or adoption potential.",
        headline: "Meta hires a new AI infra lead",
        summary: "Meta hired a new executive to run AI infrastructure programs.",
      }),
    ).toBe("");
    expect(
      isGenericWhyItMatters(
        "Commercial partnerships matter because they convert technical progress into distribution, customers, and revenue signal.",
      ),
    ).toBe(true);
  });

  it("rejects low-value expanded summaries on homepage cards", () => {
    expect(
      hasUsableExpandedSummary({
        summary: "The app was ranking No. 57 on the App Store.",
        shortSummary: "The app was ranking No. 57 on the App Store.",
        headline: "Meta AI app climbs to No. 5 on the App Store after Muse Spark launch",
      }),
    ).toBe(false);
  });

  it("does not split sentence excerpts on abbreviations like No. 57", () => {
    expect(
      buildSentenceExcerpt("The app was ranking No. 57 on the App Store just before Meta AI's new model launched. A second sentence follows.", {
        maxSentences: 1,
      }),
    ).toBe("The app was ranking No. 57 on the App Store just before Meta AI's new model launched.");
  });

  it("treats one-line low-signal digest copy as weak evidence", () => {
    expect(isHighSignalDigestText("The app was ranking No. 57 on the App Store just before Meta AI's new model launched.")).toBe(false);
    expect(
      isHighSignalDigestText(
        "Anthropic’s most capable AI model has already found thousands of AI cybersecurity vulnerabilities across every major operating system and web browser.",
      ),
    ).toBe(true);
  });

  it("limits fallback excerpts to full sentences", () => {
    expect(
      buildSentenceExcerpt(
        "OpenAI launched a new safety program. It expands audit support for enterprise buyers. A third sentence should not appear.",
        { maxSentences: 2 },
      ),
    ).toBe("OpenAI launched a new safety program. It expands audit support for enterprise buyers.");
  });
});
