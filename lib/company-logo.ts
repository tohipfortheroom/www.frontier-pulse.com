import type { CompanyProfile } from "@/lib/seed/data";

function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

export function getCompanyLogoUrl(company: Pick<CompanyProfile, "logoUrl" | "websiteUrl">) {
  if (company.logoUrl) {
    return company.logoUrl;
  }

  const hostname = hostnameFromUrl(company.websiteUrl);

  if (!hostname) {
    return null;
  }

  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(`https://${hostname}`)}`;
}

export function getCompanyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
