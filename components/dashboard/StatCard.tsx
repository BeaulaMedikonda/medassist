import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "brand" | "amber" | "sky" | "violet" | "rose" | "slate" | "accent";

const toneStyles: Record<Tone, string> = {
  brand:
    "bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 ring-brand-200/60 dark:from-brand-900/50 dark:to-brand-900/20 dark:text-brand-300 dark:ring-brand-800/60",
  accent:
    "bg-gradient-to-br from-accent-100 to-accent-50 text-accent-700 ring-accent-200/60 dark:from-accent-900/40 dark:to-accent-900/15 dark:text-accent-300 dark:ring-accent-800/60",
  amber:
    "bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 ring-amber-200/60 dark:from-amber-900/40 dark:to-amber-900/15 dark:text-amber-300 dark:ring-amber-800/60",
  sky: "bg-gradient-to-br from-sky-100 to-sky-50 text-sky-700 ring-sky-200/60 dark:from-sky-900/40 dark:to-sky-900/15 dark:text-sky-300 dark:ring-sky-800/60",
  violet:
    "bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700 ring-violet-200/60 dark:from-violet-900/40 dark:to-violet-900/15 dark:text-violet-300 dark:ring-violet-800/60",
  rose: "bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 ring-rose-200/60 dark:from-rose-900/40 dark:to-rose-900/15 dark:text-rose-300 dark:ring-rose-800/60",
  slate:
    "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700 ring-slate-200/60 dark:from-ink-800 dark:to-ink-900 dark:text-ink-300 dark:ring-ink-700",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const inner = (
    <div className="card group relative flex items-start gap-4 overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-elevated dark:hover:border-ink-700">
      {/* Subtle corner accent */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-60",
          tone === "brand" && "bg-brand-200 dark:bg-brand-700",
          tone === "accent" && "bg-accent-200 dark:bg-accent-700",
          tone === "amber" && "bg-amber-200 dark:bg-amber-700",
          tone === "sky" && "bg-sky-200 dark:bg-sky-700",
          tone === "violet" && "bg-violet-200 dark:bg-violet-700",
          tone === "rose" && "bg-rose-200 dark:bg-rose-700",
          tone === "slate" && "bg-slate-200 dark:bg-ink-700",
        )}
      />
      {icon ? (
        <div
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
            toneStyles[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="relative min-w-0 flex-1">
        <div className="text-2xl font-bold leading-tight text-slate-900 dark:text-ink-100">
          {value}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-ink-200">
          {label}
        </div>
        {hint ? (
          <div className="mt-1 text-[11px] text-slate-500 dark:text-ink-500">
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
