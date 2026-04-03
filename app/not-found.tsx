import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-5 py-16">
      <div className="w-full rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.9)] p-8 text-center backdrop-blur-sm">
        <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
          Not Found
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--text-primary)]">
          That page is off the board.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          The route you requested does not exist in the current tracker build. Try the homepage, leaderboard, or news
          stream instead.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Home
          </Link>
          <Link href="/leaderboard" className={buttonVariants({ variant: "secondary" })}>
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
