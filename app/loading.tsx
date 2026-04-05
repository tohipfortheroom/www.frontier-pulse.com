import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <div className="space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-16 w-full max-w-3xl" />
          <Skeleton className="h-6 w-full max-w-2xl" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-44" />
            <Skeleton className="h-12 w-44" />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>

        <div className="surface-card rounded-2xl border border-[var(--border)] p-5">
          <Skeleton className="h-12 w-full" />
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
