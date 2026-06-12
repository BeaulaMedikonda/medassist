import { PatientSignOutButton } from "@/components/patient/PatientSignOutButton";
import { PatientPortalNav } from "@/components/patient/PatientPortalNav";
import { initials } from "@/lib/utils";
import type { Clinic, Patient } from "@/types/db";

export function PatientPortalShell({
  patient,
  clinic,
  children,
}: {
  patient: Patient;
  clinic: Clinic | null;
  children: React.ReactNode;
}) {
  const displayName = titleCaseName(patient.full_name);
  const clinicName = clinic?.name || "Patient Portal";

  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app-bg min-h-screen text-slate-950 lg:grid lg:h-screen lg:grid-cols-[272px_1fr] lg:overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden bg-[#062f40] text-white lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        <div className="flex h-full flex-col">

          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="brand-mark h-11 w-11 shrink-0">
              <StethoscopeIcon />
            </div>
            <div>
              <div className="text-[16px] font-extrabold tracking-tight text-white">
                MedAssist
              </div>
              <div className="text-[12px] font-medium text-cyan-100/60 truncate max-w-[148px]">
                {clinicName}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-white/8" />

          {/* Nav */}
          <div className="mt-4 flex-1 overflow-y-auto px-3">
            <PatientPortalNav />
          </div>

          {/* Bottom user card */}
          <div className="mx-3 mb-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-[12px] font-extrabold text-white shadow-sm">
                {initials(patient.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-white leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] font-semibold text-cyan-100/50">Patient</p>
              </div>
            </div>
            <div className="border-t border-white/8 px-3 pb-3">
              <PatientSignOutButton variant="dark" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="relative min-w-0 overflow-hidden lg:h-screen lg:overflow-y-auto">

        {/* Mobile header */}
        <header className="border-b border-slate-200/70 bg-white/88 backdrop-blur lg:hidden">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="brand-mark h-10 w-10 text-sm font-extrabold">
                  {initials(patient.full_name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-extrabold tracking-tight">
                    {displayName}
                  </div>
                  <div className="truncate text-[11px] font-semibold text-slate-500">
                    {clinicName}
                  </div>
                </div>
              </div>
              <PatientSignOutButton />
            </div>
            <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-[#1b5364] bg-[#073142] p-2">
              <PatientPortalNav />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

          {/* Hero */}
          <div className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            {/* Teal accent strip */}
            <div className="h-1 w-full bg-gradient-to-r from-[#0ea5a4] via-[#22c7bd] to-[#0ea5a4]/40" />
            <div className="flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {/* Date chip */}
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {todayLabel}
                </div>
                {/* Greeting */}
                <h1 className="mt-1.5 text-[22px] font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  {greeting},{" "}
                  <span className="text-[#0c8a89]">{displayName}</span>
                </h1>
                <p className="mt-0.5 text-[13px] font-medium text-slate-400">
                  {clinicName}
                </p>
              </div>

              {/* Quick stat pill */}
              <div className="mt-3 flex items-center gap-2 sm:mt-0">
                <div className="inline-flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3.5 py-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-[#0ea5a4]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21a8 8 0 10-16 0" />
                    <circle cx="12" cy="8" r="4" />
                  </svg>
                  <span className="text-[12px] font-extrabold text-[#0c8a89]">
                    Your health record
                  </span>
                </div>
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

function titleCaseName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function StethoscopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M6 3v6a4 4 0 008 0V3" />
      <path d="M10 14v2a4 4 0 008 0v-2" />
      <circle cx="18" cy="11" r="2" />
    </svg>
  );
}
