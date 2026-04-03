import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[rgba(18,18,26,0.9)] py-10 text-center">
      <div className="mx-auto max-w-3xl px-5">
        <p className="text-sm text-[var(--text-tertiary)]">
          The AI Company Tracker follows the companies shaping the AI era.
        </p>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          Built with conviction. Updated daily.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--text-secondary)]">
          <Link href="/feed.xml" className="text-[var(--accent-blue)] transition-colors duration-150 hover:text-[var(--text-primary)]">
            Main RSS Feed
          </Link>
          <span className="text-[var(--text-tertiary)]">•</span>
          <Link href="/news" className="transition-colors duration-150 hover:text-[var(--text-primary)]">
            Latest News
          </Link>
        </div>
      </div>
    </footer>
  );
}
