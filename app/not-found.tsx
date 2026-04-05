import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-5 py-16">
      <div className="surface-card w-full rounded-3xl border border-[var(--border)] p-8 text-center backdrop-blur-sm">
        <div className="flex justify-center">
          <BrandLogo variant="full" alt="" className="text-[20px]" />
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
          Not Found
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--text-primary)]">
          This page isn&apos;t on our radar yet.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          The route you requested doesn&apos;t exist in the current tracker build. Search the stream or jump to one of the
          core pages below.
        </p>
        <form action="/news" className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Input type="search" name="q" placeholder="Search the news stream" className="flex-1" />
          <button type="submit" className={buttonVariants({ variant: "primary" })}>
            Search
          </button>
        </form>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Home
          </Link>
          <Link href="/news" className={buttonVariants({ variant: "secondary" })}>
            News
          </Link>
          <Link href="/leaderboard" className={buttonVariants({ variant: "secondary" })}>
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
