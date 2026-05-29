import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "brand" | "amber" | "sky" | "violet" | "rose" | "slate" | "accent";

// Soft pastel tinted card surface (very subtle wash → white)
const toneCard: Record<Tone, string> = {
  brand:  "bg-gradient-to-br from-[#eef5ff] to-white dark:from-brand-900/20 dark:to-ink-900",
  accent: "bg-gradient-to-br from-[#ecfdf7] to-white dark:from-accent-900/20 dark:to-ink-900",
  amber:  "bg-gradient-to-br from-[#fff6ec] to-white dark:from-amber-900/20 dark:to-ink-900",
  sky:    "bg-gradient-to-br from-[#ecfeff] to-white dark:from-sky-900/20 dark:to-ink-900",
  violet: "bg-gradient-to-br from-[#f5f2ff] to-white dark:from-violet-900/20 dark:to-ink-900",
  rose:   "bg-gradient-to-br from-[#fff1f3] to-white dark:from-rose-900/20 dark:to-ink-900",
  slate:  "bg-gradient-to-br from-[#f7f9fc] to-white dark:from-ink-800/40 dark:to-ink-900",
};

const toneIcon: Record<Tone, string> = {
  brand:  "bg-[#dbeafe] text-[#2563eb] dark:bg-brand-900/40 dark:text-brand-300",
  accent: "bg-[#ccfbef] text-[#0ea5a4] dark:bg-accent-900/40 dark:text-accent-300",
  amber:  "bg-[#ffedd5] text-[#ea580c] dark:bg-amber-900/40 dark:text-amber-300",
  sky:    "bg-[#cffafe] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300",
  violet: "bg-[#ede9fe] text-[#7c3aed] dark:bg-violet-900/40 dark:text-violet-300",
  rose:   "bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-900/40 dark:text-rose-300",
  slate:  "bg-[#eef2f7] text-[#475569] dark:bg-ink-800 dark:text-ink-300",
};

const toneValue: Record<Tone, string> = {
  brand:  "text-[#2563eb] dark:text-brand-400",
  accent: "text-[#0ea5a4] dark:text-accent-400",
  amber:  "text-[#ea580c] dark:text-amber-400",
  sky:    "text-[#0891b2] dark:text-sky-400",
  violet: "text-[#7c3aed] dark:text-violet-400",
  rose:   "text-[#e11d48] dark:text-rose-400",
  slate:  "text-[#334155] dark:text-ink-200",
};

const toneGlow: Record<Tone, string> = {
  brand:  "bg-[#93c5fd] dark:bg-brand-700",
  accent: "bg-[#5eead4] dark:bg-accent-700",
  amber:  "bg-[#fdba74] dark:bg-amber-700",
  sky:    "bg-[#67e8f9] dark:bg-sky-700",
  violet: "bg-[#c4b5fd] dark:bg-violet-700",
  rose:   "bg-[#fda4af] dark:bg-rose-700",
  slate:  "bg-[#cbd5e1] dark:bg-ink-700",
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
    <div
      className={cn(
        "group relative overflow-hidden rounded-[18px] p-5 transition-all duration-200",
        "border border-[rgba(15,23,42,0.06)] dark:border-ink-800/70",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)]",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,0.16)]",
        toneCard[tone],
      )}
    >
      {/* Corner glow */}
      <div className={cn(
        "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-60",
        toneGlow[tone],
      )} />

      <div className="relative flex items-start gap-4">
        {icon ? (
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            toneIcon[tone],
          )}>
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className={cn("text-[2rem] font-bold leading-none tracking-tight", toneValue[tone])}>
            {value}
          </div>
          <div className="mt-2 text-sm font-semibold text-[#0f172a] dark:text-ink-200">
            {label}
          </div>
          {hint ? (
            <div className="mt-0.5 text-[11px] text-[#64748b] dark:text-ink-500">{hint}</div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
