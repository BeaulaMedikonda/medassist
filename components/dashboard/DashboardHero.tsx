import { greeting, formatDate } from "@/lib/dashboard-utils";

export function DashboardHero({
  name,
  clinicName,
  honorific = false,
  actions,
  meta,
  waveEmoji = false,
}: {
  name: string;
  clinicName: string;
  honorific?: boolean;
  actions?: React.ReactNode;
  /** Small chip-row under the title (e.g. "3 waiting · 2 reviewed today"). */
  meta?: React.ReactNode;
  /** Append a 👋 after the greeting (rendered outside the gradient clip). */
  waveEmoji?: boolean;
}) {
  const first = name.split(" ")[0];
  return (
    <header className="dashboard-hero relative overflow-hidden rounded-[24px] p-6 backdrop-blur-xl sm:p-8">
      {/* Soft gradient mesh */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 80% at 8% -10%, rgba(37,99,235,0.16) 0%, transparent 60%), radial-gradient(ellipse 45% 75% at 95% 0%, rgba(14,165,164,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 90% at 70% 120%, rgba(124,58,237,0.12) 0%, transparent 60%)",
        }}
      />
      {/* Diagonal sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          color: "currentColor",
          maskImage: "radial-gradient(ellipse 80% 90% at 50% 0%, black 35%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 90% at 50% 0%, black 35%, transparent 80%)",
        }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold text-slate-700 backdrop-blur-md ring-1 ring-black/[0.05] dark:bg-white/10 dark:text-ink-200 dark:ring-white/10" style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04), inset 0 1px 0 rgba(255,255,255,.7)" }}>
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: "#0ea5a4" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "#0ea5a4" }} />
            </span>
            {formatDate(new Date())}
          </div>
          <h1 className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-600 bg-clip-text text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] text-transparent dark:from-white dark:via-white dark:to-ink-300 sm:text-[2.5rem]">
            {greeting()}, {honorific ? `Dr. ${first}` : first}
            {waveEmoji ? (
              <span className="ml-2 inline-block [-webkit-text-fill-color:initial]">👋</span>
            ) : null}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#64748b] dark:text-ink-400">
            {clinicName}
          </p>
          {meta ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2.5 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
