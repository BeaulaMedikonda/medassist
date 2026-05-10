import { greeting, formatDate } from "@/lib/dashboard-utils";

export function DashboardHero({
  name,
  clinicName,
  honorific = false,
  actions,
  meta,
}: {
  name: string;
  clinicName: string;
  honorific?: boolean;
  actions?: React.ReactNode;
  /** Small chip-row under the title (e.g. "3 waiting · 2 reviewed today"). */
  meta?: React.ReactNode;
}) {
  const first = name.split(" ")[0];
  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-brand-50/40 p-6 shadow-card dark:border-ink-800 dark:from-ink-900 dark:via-ink-900 dark:to-brand-900/15 sm:p-8">
      {/* Larger, softer halos */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-200/55 blur-3xl dark:bg-brand-600/25" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent-200/45 blur-3xl dark:bg-accent-600/15" />
      {/* Diagonal sheen — only visible in dark mode for that "premium" look */}
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent dark:block" />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "currentColor",
        }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 backdrop-blur-sm dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800/60">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-400" />
            </span>
            {formatDate(new Date())}
          </div>
          <h1 className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:via-white dark:to-ink-300 sm:text-[2.25rem] sm:leading-tight">
            {greeting()}, {honorific ? `Dr. ${first}` : first}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600 dark:text-ink-400">
            {clinicName}
          </p>
          {meta ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
