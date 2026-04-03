import { searchSite } from "@/lib/search/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
