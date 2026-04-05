import { ImageResponse } from "next/og";

import { BRAND_DESCRIPTION, BRAND_NAME_UPPER, BRAND_TAGLINE } from "@/lib/brand";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(circle at top left, rgba(77,159,255,0.22), transparent 28%), radial-gradient(circle at 85% 10%, rgba(167,139,250,0.28), transparent 22%), #0A0A0F",
          color: "#F0F0F5",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "28px",
            padding: "48px",
            background: "rgba(18,18,26,0.84)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 24, letterSpacing: 5, textTransform: "uppercase", color: "#8888A0" }}>
              {BRAND_NAME_UPPER}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#00E68A", fontSize: 22 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "999px",
                  background: "#00E68A",
                }}
              />
              LIVE
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.02 }}>{BRAND_TAGLINE}</div>
            <div style={{ fontSize: 30, lineHeight: 1.4, color: "#8888A0", maxWidth: 880 }}>
              {BRAND_DESCRIPTION}
            </div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {["Leaderboard", "Latest News", "Daily Digest"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "16px 24px",
                  borderRadius: 16,
                  border: "1px solid rgba(77,159,255,0.35)",
                  color: "#4D9FFF",
                  fontSize: 24,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
