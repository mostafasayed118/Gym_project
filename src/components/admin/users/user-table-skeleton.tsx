import { Skeleton } from "@/components/ui/skeleton";

export function UserTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {/* Table header skeleton */}
      <div className="flex items-center gap-4 border-b border-[#444933]/10 px-4 py-3">
        <Skeleton className="h-3 w-16 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="h-3 w-12 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="h-3 w-14 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="h-3 w-16 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="h-3 w-12 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="ml-auto h-3 w-12 rounded bg-[#282b1d] skeleton-shimmer" />
      </div>

      {/* Table row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-[#444933]/10 px-4 py-3 transition-colors"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* User (Avatar + Name + Email) */}
          <div className="flex min-w-[220px] flex-1 items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full bg-[#282b1d] skeleton-shimmer" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28 rounded bg-[#282b1d] skeleton-shimmer" />
              <Skeleton className="h-3 w-36 rounded bg-[#1e2113] skeleton-shimmer" />
            </div>
          </div>

          {/* Role badge */}
          <div className="w-[80px]">
            <Skeleton className="h-5 w-14 rounded-full bg-[#282b1d] skeleton-shimmer" />
          </div>

          {/* Status pill */}
          <div className="w-[90px]">
            <Skeleton className="h-5 w-16 rounded-full bg-[#282b1d] skeleton-shimmer" />
          </div>

          {/* Coach */}
          <div className="w-[120px]">
            <Skeleton className="h-4 w-20 rounded bg-[#282b1d] skeleton-shimmer" />
          </div>

          {/* Joined date */}
          <div className="w-[80px]">
            <Skeleton className="h-4 w-14 rounded bg-[#282b1d] skeleton-shimmer" />
          </div>

          {/* Actions */}
          <div className="ml-auto w-[40px]">
            <Skeleton className="size-8 rounded-lg bg-[#282b1d] skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
