import { searchSite } from "@/lib/search/server";
import { enforceRateLimit, getRequestIdentity } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimit = enforceRateLimit({
    namespace: "api-search",
    key: getRequestIdentity(request),
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: "Too many search requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return Response.json({
      companies: [],
      news: [],
    });
  }

  const results = await searchSite(query);
  return Response.json(results);
}
