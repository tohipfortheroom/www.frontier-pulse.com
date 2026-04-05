"use client";

import { Copy, Link2, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { BRAND_UTM_SOURCE } from "@/lib/brand";
import { cn } from "@/lib/utils";

function buildShareUrl(path: string) {
  const base = typeof window === "undefined" ? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000" : window.location.origin;
  const url = new URL(path, base);
  url.searchParams.set("utm_source", BRAND_UTM_SOURCE);
  url.searchParams.set("utm_medium", "share");
  return url.toString();
}

export function ShareButton({
  path,
  title,
  text,
  className,
}: {
  path: string;
  title: string;
  text?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pushToast } = useToast();
  const shareUrl = useMemo(() => buildShareUrl(path), [path]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    pushToast({
      tone: "success",
      title: "Link copied",
      description: "The share link is ready to paste.",
    });
    setOpen(false);
  }

  async function onPrimaryShare() {
    if (typeof navigator !== "undefined" && navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      await navigator.share({
        title,
        text,
        url: shareUrl,
      });
      return;
    }

    setOpen((current) => !current);
  }

  const shareText = encodeURIComponent(text ? `${title} — ${text}` : title);
  const encodedUrl = encodeURIComponent(shareUrl);
  const socials = [
    { label: "Share to X", href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${shareText}` },
    { label: "Share to LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Share to Bluesky", href: `https://bsky.app/intent/compose?text=${shareText}%20${encodedUrl}` },
  ];

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => void onPrimaryShare()}
        className="surface-soft inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open ? (
        <div className="surface-card-strong panel-shadow-strong absolute right-0 top-10 z-20 min-w-[13rem] rounded-2xl border border-[var(--border)] p-2 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </button>
          {socials.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            >
              {item.label.includes("LinkedIn") || item.label.includes("Bluesky") ? (
                <Link2 className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
