import { createTextStreamResponse } from "ai";

import { getCompanyDetailData, getHomePageData, getLeaderboardData, getNewsItemsData } from "@/lib/db/queries";
import { isLlmConfigured, streamLlmText, streamStaticText } from "@/lib/llm/openai";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { companiesBySlug } from "@/lib/seed/data";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function inferCompanySlug(question: string) {
  const normalized = question.toLowerCase();

  return Object.values(companiesBySlug).find((company) => {
    const labels = [company.slug, company.name, company.shortName].map((value) => value.toLowerCase());
    return labels.some((label) => normalized.includes(label));
  })?.slug;
}

function buildGenericOfflineAnswer(
  question: string,
  homepage: Awaited<ReturnType<typeof getHomePageData>>,
  leaderboard: Awaited<ReturnType<typeof getLeaderboardData>>,
  news: Awaited<ReturnType<typeof getNewsItemsData>>,
  companyContext: Awaited<ReturnType<typeof getCompanyDetailData>> | null,
) {
  const latestStories = homepage.todayStories.slice(0, 3);

  if (companyContext) {
    const { company, momentum, recentNews } = companyContext;
    const latestHeadline = recentNews[0]?.headline;

    if (/momentum|gaining|driving/i.test(question)) {
      return `${company.name}'s momentum is currently ${momentum ? `${momentum.score >= 0 ? "positive" : "negative"} at ${momentum.score.toFixed(1)}` : "not available"}. ${momentum?.keyDriver ?? "The strongest recent signal comes from the latest company updates."}${latestHeadline ? ` The newest headline in context is "${latestHeadline}."` : ""}`;
    }

    if (/compare|competitor/i.test(question)) {
      const peers = leaderboard
        .filter((row) => row.companySlug !== company.slug)
        .slice(0, 3)
        .map((row) => `${companiesBySlug[row.companySlug]?.name ?? row.companySlug} (${row.score >= 0 ? "+" : ""}${row.score.toFixed(1)})`)
        .join(", ");

      return `${company.name} matters because ${company.whyItMatters} In the current leaderboard context, the closest comparison set is ${peers || "the rest of the field"}.`;
    }

    if (/risk|weakness/i.test(question)) {
      return `${company.name}'s biggest risks in the provided context are ${company.weaknesses.slice(0, 2).join(" ")}${latestHeadline ? ` A near-term watch item is "${latestHeadline}."` : ""}`;
    }

    if (/launch|recent/i.test(question)) {
      return recentNews.length > 0
        ? recentNews
            .slice(0, 3)
            .map((item, index) => `${index === 0 ? "Most recently" : "Then"}, ${item.headline}. ${item.shortSummary}`)
            .join(" ")
        : `I don't have recent launch context loaded for ${company.name}.`;
    }
  }

  if (/week|important|top story|most important/i.test(question)) {
    return `The strongest recent stories are ${latestStories.map((story) => `"${story.headline}"`).join(", ")}. The current leaderboard is led by ${leaderboard
      .slice(0, 3)
      .map((row) => companiesBySlug[row.companySlug]?.name ?? row.companySlug)
      .join(", ")}.`;
  }

  if (/openai|anthropic|google|meta|microsoft|deepseek|mistral|nvidia|amazon|xai/i.test(question)) {
    const inferredSlug = inferCompanySlug(question);
    const related = inferredSlug ? news.filter((item) => item.companySlugs.includes(inferredSlug)).slice(0, 2) : [];

    if (inferredSlug && related.length > 0) {
      const companyName = companiesBySlug[inferredSlug]?.name ?? inferredSlug;
      return `${companyName} is currently being defined by ${related.map((item) => `"${item.headline}"`).join(" and ")}.`;
    }
  }

  return `Frontier Pulse is currently tracking ${homepage.todayStories.length} notable stories today. The board is led by ${leaderboard
    .slice(0, 3)
    .map((row) => `${companiesBySlug[row.companySlug]?.name ?? row.companySlug} (${row.score >= 0 ? "+" : ""}${row.score.toFixed(1)})`)
    .join(", ")}.`;
}

export async function POST(request: Request) {
  const sessionId = request.headers.get("x-chat-session-id")?.trim() || "anonymous";
  const rateLimit = enforceRateLimit({
    namespace: "api-chat",
    key: sessionId,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: "Too many chat requests. Please wait a minute and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = (await request.json()) as {
    slug?: string;
    messages?: ChatMessage[];
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "Missing messages." }, { status: 400 });
  }

  const latestQuestion = [...body.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const requestedSlug = body.slug ?? inferCompanySlug(latestQuestion);

  const [companyContext, leaderboard, homepage, news] = await Promise.all([
    requestedSlug ? getCompanyDetailData(requestedSlug) : Promise.resolve(null),
    getLeaderboardData(),
    getHomePageData(),
    getNewsItemsData(),
  ]);

  const conversation = body.messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  const contextBlocks = [
    `Leaderboard snapshot: ${leaderboard
      .slice(0, 10)
      .map((item, index) => `${index + 1}. ${companiesBySlug[item.companySlug]?.name ?? item.companySlug} ${item.score >= 0 ? "+" : ""}${item.score.toFixed(1)} (${item.keyDriver})`)
      .join(" | ")}`,
    `Today's top stories: ${homepage.todayStories
      .slice(0, 5)
      .map((item) => `${item.headline} — ${item.shortSummary}`)
      .join(" | ")}`,
  ];

  if (companyContext) {
    contextBlocks.push(
      `Company: ${companyContext.company.name}`,
      `Overview: ${companyContext.company.overview}`,
      `Why it matters: ${companyContext.company.whyItMatters}`,
      `Strengths: ${companyContext.company.strengths.join(" | ")}`,
      `Weaknesses: ${companyContext.company.weaknesses.join(" | ")}`,
      `Momentum: ${companyContext.momentum ? `${companyContext.momentum.score.toFixed(1)} (${companyContext.momentum.keyDriver})` : "Unavailable"}`,
      `Products: ${companyContext.company.products.map((product) => `${product.name}: ${product.description}`).join(" | ")}`,
      `Recent news: ${companyContext.recentNews.map((item) => `${item.headline} — ${item.summary}`).join(" | ")}`,
    );
  }

  const contextBlock = contextBlocks.join("\n");

  if (!isLlmConfigured()) {
    return createTextStreamResponse({
      textStream: streamStaticText(buildGenericOfflineAnswer(latestQuestion, homepage, leaderboard, news, companyContext)),
    });
  }

  try {
    const textStream = await streamLlmText({
      systemPrompt: `You are Frontier Pulse's AI industry analyst. Answer questions using only the provided context. Be concise, analytical, and explicit when the context is incomplete. If company-specific context is present, use it. Do not invent facts outside the supplied context.`,
      prompt: `${contextBlock}\n\nConversation so far:\n${conversation}\n\nAnswer the latest user question using only the context above.`,
      temperature: 0.3,
      maxOutputTokens: 600,
    });

    return createTextStreamResponse({ textStream });
  } catch {
    return createTextStreamResponse({
      textStream: streamStaticText(buildGenericOfflineAnswer(latestQuestion, homepage, leaderboard, news, companyContext)),
    });
  }
}
