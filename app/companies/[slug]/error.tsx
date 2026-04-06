"use client";

import Link from "next/link";
import { useEffect } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";

export default function CompanyError({
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
      <div className="surface-card w-full rounded-3xl border border-[var(--border)] p-8 text-center backdrop-blur-sm">
        <div className="flex justify-center">
          <BrandLogo variant="full" alt="" className="text-[20px]" />
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-amber)]">
          Company Data Unavailable
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--text-primary)]">
          Couldn&apos;t load this company.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          The company profile didn&apos;t load cleanly this time. Try again, or browse all tracked companies.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className={buttonVariants({ variant: "primary" })}>
            Try again
          </button>
          <Link href="/companies" className={buttonVariants({ variant: "secondary" })}>
            All companies
          </Link>
        </div>
      </div>
    </div>
  );
}
