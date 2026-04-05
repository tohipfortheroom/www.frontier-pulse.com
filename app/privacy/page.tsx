import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Frontier Pulse privacy policy covering newsletter emails, notification endpoints, and operational data handling.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
      <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
          Privacy Policy
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--text-primary)]">
          Minimal collection, straightforward use
        </h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-[var(--text-secondary)]">
          <p>
            Frontier Pulse collects email addresses for newsletter delivery, push subscription endpoints for breaking
            news alerts, and limited operational telemetry needed to keep the product working.
          </p>
          <p>
            The site does not sell personal data to third parties. We do not use unnecessary cookies. Browser storage is
            used for product features such as bookmarks, theme preference, and temporary chat session limits.
          </p>
          <p>
            Source data is gathered from public RSS feeds, public APIs, and editorial normalization. If you subscribe to
            the newsletter or notifications, you can stop at any time by unsubscribing or removing the notification
            permission in your browser settings.
          </p>
        </div>
      </div>
    </div>
  );
}
