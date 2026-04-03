import { Skeleton } from "@/components/ui/skeleton";

type PageLoadingVariant = "news" | "companies" | "company" | "leaderboard" | "compare" | "digest";

export function PageLoading({ variant }: { variant: PageLoadingVariant }) {
  if (variant === "company") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-8">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-6 h-14 w-72" />
              <Skeleton className="mt-4 h-28 w-full" />
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-8">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-5 h-14 w-28" />
              <Skeleton className="mt-5 h-28 w-full" />
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-60" />
            <Skeleton className="h-60" />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "leaderboard") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="space-y-8">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-16 w-full max-w-3xl" />
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    );
  }

  if (variant === "compare") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="space-y-8">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-16 w-full max-w-3xl" />
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
            <Skeleton className="h-[420px]" />
            <Skeleton className="h-[420px]" />
          </div>
          <Skeleton className="h-[360px]" />
        </div>
      </div>
    );
  }

  if (variant === "digest") {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 lg:py-20">
        <div className="space-y-8">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-14 w-full max-w-2xl" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <div className="space-y-8">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full max-w-3xl" />
        <Skeleton className="h-14 w-full" />
        <div className={variant === "news" ? "grid gap-5" : "grid gap-5 md:grid-cols-2 xl:grid-cols-3"}>
          {Array.from({ length: variant === "news" ? 6 : 6 }).map((_, index) => (
            <Skeleton key={index} className={variant === "news" ? "h-56" : "h-64"} />
          ))}
        </div>
      </div>
    </div>
  );
}
