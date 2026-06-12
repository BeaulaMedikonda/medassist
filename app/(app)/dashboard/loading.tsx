import { SkeletonHero, SkeletonStatCard, SkeletonTableRows } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-7">
      <SkeletonHero />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </section>

      <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="h-12 animate-pulse bg-slate-50 dark:bg-ink-900/60" />
        <table className="w-full">
          <tbody>
            <SkeletonTableRows rows={6} cols={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
