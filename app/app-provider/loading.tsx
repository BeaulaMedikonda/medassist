function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export default function AppProviderLoading() {
  return (
    <div className="space-y-6">
      <div className="premium-panel px-5 py-5">
        <SkeletonBlock className="h-3 w-36" />
        <SkeletonBlock className="mt-4 h-8 w-80 max-w-full" />
        <SkeletonBlock className="mt-4 h-4 w-[520px] max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card p-4">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-7 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="table-shell">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
