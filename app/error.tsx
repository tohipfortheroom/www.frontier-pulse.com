"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-5 py-16">
      <div className="w-full rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.9)] p-8 text-center backdrop-blur-sm">
        <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-red)]">
          Error State
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--text-primary)]">
          Something broke while loading the tracker.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          The app hit an unexpected error while assembling this page. You can retry the request or jump back to the
          live homepage.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className={buttonVariants({ variant: "primary" })}>
            Try again
          </button>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
