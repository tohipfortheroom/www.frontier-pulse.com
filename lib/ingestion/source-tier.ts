import type { SourceTier } from "./types.ts";

export function getSourceTierLabel(tier: SourceTier | null | undefined) {
  switch (tier) {
    case "official":
      return "Official";
    case "major-media":
      return "Reputable media";
    case "trade-media":
    case "research-repository":
      return "Analysis / secondary";
    case "community":
    case "manual":
    default:
      return "Community / weak signal";
  }
}
