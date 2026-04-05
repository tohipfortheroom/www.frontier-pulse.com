import { getSupabaseServiceClient } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlPage(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Frontier Pulse</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #0b0d12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f5f7fb;
    }
    .card {
      max-width: 480px;
      padding: 48px 40px;
      text-align: center;
      background: #111422;
      border-radius: 12px;
      border: 1px solid #1e2130;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 12px;
    }
    p {
      font-size: 15px;
      color: #a0a5b8;
      margin: 0 0 24px;
      line-height: 1.6;
    }
    a {
      color: #00e68a;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Return to Frontier Pulse</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function isValidToken(email: string, token: string): boolean {
  // Demo validation: token is base64 encoding of the email
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded === email;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (!email || !token) {
    return htmlPage(
      "Invalid Link",
      "This unsubscribe link is missing required parameters. Please use the link from your email.",
    );
  }

  // Validate token: accept both base64-of-email (demo) and real unsubscribe tokens from DB
  const isBase64Valid = isValidToken(email, token);

  const client = getSupabaseServiceClient();

  if (client) {
    // Try to find subscriber by email and validate against stored token
    const { data: subscriber } = await client
      .from("subscribers")
      .select("id, unsubscribe_token")
      .eq("email", email)
      .maybeSingle();

    if (!subscriber) {
      return htmlPage(
        "Not Found",
        "We could not find a subscription for this email address.",
      );
    }

    const isDbTokenValid = subscriber.unsubscribe_token === token;

    if (!isBase64Valid && !isDbTokenValid) {
      return htmlPage(
        "Invalid Link",
        "This unsubscribe link is not valid. Please use the link from your most recent email.",
      );
    }

    // Soft-delete: set unsubscribed_at
    const { error } = await client
      .from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", subscriber.id);

    if (error) {
      console.error("[unsubscribe] DB error:", error.message);
      return htmlPage(
        "Something Went Wrong",
        "We were unable to process your unsubscribe request. Please try again later.",
      );
    }

    return htmlPage(
      "You Have Been Unsubscribed",
      "You will no longer receive daily digest emails from Frontier Pulse. We're sorry to see you go.",
    );
  }

  // No Supabase configured: validate base64 token only, return success page
  if (!isBase64Valid) {
    return htmlPage(
      "Invalid Link",
      "This unsubscribe link is not valid. Please use the link from your most recent email.",
    );
  }

  return htmlPage(
    "You Have Been Unsubscribed",
    "You will no longer receive daily digest emails from Frontier Pulse. We're sorry to see you go.",
  );
}
