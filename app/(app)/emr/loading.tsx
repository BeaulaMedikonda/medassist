import { SkeletonHero, SkeletonTableRows } from "@/components/ui/Skeleton";

export default function EmrLoading() {
  return (
    <div className="space-y-7">
      <SkeletonHero />

      <div className="h-16 animate-pulse rounded-[20px] bg-white dark:bg-ink-900" />

      <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="h-12 animate-pulse bg-slate-50 dark:bg-ink-900/60" />
        <table className="w-full">
          <tbody>
            <SkeletonTableRows rows={8} cols={7} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
