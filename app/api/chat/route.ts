import { createTextStreamResponse } from "ai";

import { getCompanyDetailData, getLeaderboardData } from "@/lib/db/queries";
import { isLlmConfigured, streamLlmText, streamStaticText } from "@/lib/llm/openai";
import { companiesBySlug } from "@/lib/seed/data";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildOfflineAnswer(question: string, context: Awaited<ReturnType<typeof getCompanyDetailData>>, leaderboard: Awaited<ReturnType<typeof getLeaderboardData>>) {
  if (!context) {
    return "I couldn't load company context for that request.";
  }

  const { company, momentum, recentNews } = context;
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

  if (/watch|next/i.test(question)) {
    return `${company.name}'s next watchpoints are ${company.products.slice(0, 2).map((product) => product.name).join(" and ")} plus whether current momentum drivers hold up in the next news cycle.`;
  }

  return `${company.name} is currently framed by this context as ${company.description} ${momentum?.keyDriver ?? company.whyItMatters}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    slug?: string;
    messages?: ChatMessage[];
  };

  if (!body.slug || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "Missing slug or messages." }, { status: 400 });
  }

  const [companyContext, leaderboard] = await Promise.all([getCompanyDetailData(body.slug), getLeaderboardData()]);

  if (!companyContext) {
    return Response.json({ error: "Company not found." }, { status: 404 });
  }

  const conversation = body.messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
  const latestQuestion = [...body.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const contextBlock = [
    `Company: ${companyContext.company.name}`,
    `Overview: ${companyContext.company.overview}`,
    `Why it matters: ${companyContext.company.whyItMatters}`,
    `Strengths: ${companyContext.company.strengths.join(" | ")}`,
    `Weaknesses: ${companyContext.company.weaknesses.join(" | ")}`,
    `Momentum: ${companyContext.momentum ? `${companyContext.momentum.score.toFixed(1)} (${companyContext.momentum.keyDriver})` : "Unavailable"}`,
    `Products: ${companyContext.company.products.map((product) => `${product.name}: ${product.description}`).join(" | ")}`,
    `Recent news: ${companyContext.recentNews.map((item) => `${item.headline} — ${item.summary}`).join(" | ")}`,
    `Leaderboard snapshot: ${leaderboard
      .slice(0, 5)
      .map((item) => `${companiesBySlug[item.companySlug]?.name ?? item.companySlug} ${item.score >= 0 ? "+" : ""}${item.score.toFixed(1)}`)
      .join(" | ")}`,
  ].join("\n");

  if (!isLlmConfigured()) {
    return createTextStreamResponse({
      textStream: streamStaticText(buildOfflineAnswer(latestQuestion, companyContext, leaderboard)),
    });
  }

  try {
    const textStream = await streamLlmText({
      systemPrompt: `You are an AI industry analyst. Answer questions about ${companyContext.company.name} based only on the provided context. Be concise, analytical, and explicit about uncertainty when the context is incomplete.`,
      prompt: `${contextBlock}\n\nConversation so far:\n${conversation}\n\nAnswer the latest user question using only the context above.`,
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    return createTextStreamResponse({ textStream });
  } catch {
    return createTextStreamResponse({
      textStream: streamStaticText(buildOfflineAnswer(latestQuestion, companyContext, leaderboard)),
    });
  }
}
