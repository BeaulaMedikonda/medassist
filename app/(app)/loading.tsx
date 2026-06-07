function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <section className="dashboard-hero rounded-[24px] p-6">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="mt-4 h-9 w-80 max-w-full" />
        <SkeletonBlock className="mt-4 h-4 w-[560px] max-w-full" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-32" />
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="premium-panel overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <SkeletonBlock className="h-4 w-40" />
          </div>
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>

        <div className="premium-panel p-5">
          <SkeletonBlock className="h-4 w-36" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3 w-3/4" />
                  <SkeletonBlock className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
