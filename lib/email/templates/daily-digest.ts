import type { DailyDigestRecord } from "@/lib/db/types";
import type { MomentumSnapshot, NewsItem } from "@/lib/seed/data";

type DigestEmailData = {
  digest: DailyDigestRecord;
  leaderboard: MomentumSnapshot[];
  subscriberEmail: string;
  unsubscribeToken: string;
  siteUrl: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function trendArrow(trend: string): string {
  if (trend === "up") return "&#9650;";
  if (trend === "down") return "&#9660;";
  return "&#9654;";
}

function trendColor(trend: string): string {
  if (trend === "up") return "#00e68a";
  if (trend === "down") return "#ff4d6a";
  return "#8a8f9e";
}

function buildStoryRow(story: NewsItem, companyName: string): string {
  const impactColor =
    story.impactDirection === "positive"
      ? "#00e68a"
      : story.impactDirection === "negative"
        ? "#ff4d6a"
        : "#4d9fff";

  return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #1e2130;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <a href="\${siteUrl}/news/\${story.slug}" style="color: #f5f7fb; text-decoration: none; font-size: 16px; font-weight: 600; line-height: 1.4;">
                ${escapeHtml(story.headline)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 6px;">
              <span style="display: inline-block; background: ${impactColor}22; color: ${impactColor}; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${escapeHtml(companyName)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 8px; color: #a0a5b8; font-size: 14px; line-height: 1.5;">
              ${escapeHtml(story.shortSummary)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function buildLeaderboardRow(snapshot: MomentumSnapshot, index: number): string {
  const arrow = trendArrow(snapshot.trend);
  const color = trendColor(snapshot.trend);
  const sign = snapshot.scoreChange24h >= 0 ? "+" : "";

  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #1e2130;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 30px; color: #8a8f9e; font-size: 14px; font-weight: 700; vertical-align: middle;">
              ${index + 1}.
            </td>
            <td style="vertical-align: middle;">
              <span style="color: #f5f7fb; font-size: 15px; font-weight: 600;">
                ${escapeHtml(snapshot.companySlug)}
              </span>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 80px;">
              <span style="color: #f5f7fb; font-size: 15px; font-weight: 700;">
                ${snapshot.score}
              </span>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 80px;">
              <span style="color: ${color}; font-size: 13px; font-weight: 600;">
                ${arrow} ${sign}${snapshot.scoreChange24h}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildDigestEmailHtml(data: DigestEmailData): string {
  const { digest, leaderboard, subscriberEmail, unsubscribeToken, siteUrl } = data;
  const { digest: digestData, topStories, mostImportantStory } = digest;

  const dateDisplay = formatDate(digestData.date);
  const top5Stories = topStories.slice(0, 5);
  const top5Leaderboard = leaderboard.slice(0, 5);

  const storyRows = top5Stories
    .map((story) => {
      const companySlug = story.companySlugs[0] ?? "AI";
      return buildStoryRow(story, companySlug);
    })
    .join("");

  const leaderboardRows = top5Leaderboard
    .map((snapshot, idx) => buildLeaderboardRow(snapshot, idx))
    .join("");

  const headlineSection = digestData.headlineOfTheDay
    ? `
    <tr>
      <td style="padding: 24px; background: linear-gradient(135deg, #00e68a15 0%, #4d9fff15 100%); border-radius: 8px; border: 1px solid #1e2130;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 11px; font-weight: 700; color: #00e68a; text-transform: uppercase; letter-spacing: 1.5px; padding-bottom: 8px;">
              Headline of the Day
            </td>
          </tr>
          <tr>
            <td style="font-size: 20px; font-weight: 700; color: #f5f7fb; line-height: 1.3;">
              ${escapeHtml(digestData.headlineOfTheDay)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 24px;"></td></tr>`
    : "";

  const mostImportantSection = mostImportantStory
    ? `
    <tr>
      <td style="padding-bottom: 16px;">
        <a href="${siteUrl}/news/${mostImportantStory.slug}" style="color: #4d9fff; text-decoration: none; font-size: 14px; font-weight: 600;">
          Most impactful story: ${escapeHtml(mostImportantStory.headline)} &rarr;
        </a>
      </td>
    </tr>`
    : "";

  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(subscriberEmail)}&token=${encodeURIComponent(unsubscribeToken)}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Frontier Pulse Daily Digest - ${escapeHtml(dateDisplay)}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #080a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #080a0f;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Main container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #0b0d12; border-radius: 12px; overflow: hidden; border: 1px solid #1e2130;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(180deg, #111422 0%, #0b0d12 100%); text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 24px; font-weight: 800; color: #f5f7fb; letter-spacing: -0.5px; padding-bottom: 4px;">
                    Frontier Pulse
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; font-weight: 600; color: #00e68a; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 12px;">
                    Daily Digest
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #8a8f9e;">
                    ${escapeHtml(dateDisplay)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Headline of the day -->
                ${headlineSection}

                <!-- Summary -->
                <tr>
                  <td style="color: #a0a5b8; font-size: 15px; line-height: 1.6; padding-bottom: 28px;">
                    ${escapeHtml(digestData.summary)}
                  </td>
                </tr>

                ${mostImportantSection}

                <!-- Top Stories -->
                <tr>
                  <td style="padding-bottom: 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; color: #4d9fff; text-transform: uppercase; letter-spacing: 1.5px; padding-bottom: 12px; border-bottom: 2px solid #4d9fff;">
                          Top Stories
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${storyRows}
                    </table>
                  </td>
                </tr>

                <tr><td style="height: 28px;"></td></tr>

                <!-- Leaderboard -->
                <tr>
                  <td style="padding-bottom: 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; color: #00e68a; text-transform: uppercase; letter-spacing: 1.5px; padding-bottom: 12px; border-bottom: 2px solid #00e68a;">
                          Momentum Leaderboard
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${leaderboardRows}
                    </table>
                  </td>
                </tr>

                <tr><td style="height: 32px;"></td></tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #00e68a 0%, #00c878 100%); border-radius: 8px;">
                          <a href="${siteUrl}/daily-digest" style="display: inline-block; padding: 14px 32px; color: #0b0d12; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
                            View Full Digest &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #080a0f; border-top: 1px solid #1e2130; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 13px; color: #5a5f72; padding-bottom: 12px;">
                    Frontier Pulse &mdash; Mission Control For AI Momentum
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #3d4155;">
                    <a href="${unsubscribeUrl}" style="color: #5a5f72; text-decoration: underline;">
                      Unsubscribe
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End main container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
