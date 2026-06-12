import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-200 dark:bg-ink-800",
        className,
      )}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-[20px] border border-slate-100 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="mb-2 h-8 w-12" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-slate-100 dark:border-ink-800">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <Skeleton className={cn("h-4", j === 0 ? "w-32" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonHero() {
  return (
    <div className="animate-pulse rounded-[24px] bg-white p-7 dark:bg-ink-900">
      <Skeleton className="mb-3 h-3 w-28" />
      <Skeleton className="mb-3 h-8 w-56" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
