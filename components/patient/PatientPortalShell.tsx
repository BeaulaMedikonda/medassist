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
  const patientMeta =
    patient.emr_number === "Pending clinic review"
      ? clinic?.name || "Patient portal"
      : `${patient.emr_number}${clinic?.name ? ` - ${clinic.name}` : ""}`;
  const displayName = titleCaseName(patient.full_name);
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="app-bg min-h-screen text-slate-950 lg:grid lg:h-screen lg:grid-cols-[292px_1fr] lg:overflow-hidden">
      <aside className="hidden bg-[#062f40] text-white lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        <div className="flex h-full flex-col px-3 py-8">
          <div className="px-3">
            <div className="flex items-center gap-3">
              <div className="brand-mark h-14 w-14">
                <StethoscopeIcon />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight">MedAssist</div>
                <div className="text-base font-semibold text-cyan-100/70">
                  {clinic?.name || "Patient health portal"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <PatientPortalNav />
          </div>

          <div className="mt-auto border-t border-white/10 px-3 py-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4c91a5]/60 bg-[#092f3a] text-sm font-extrabold text-cyan-100">
                {initials(patient.full_name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-extrabold leading-tight">{displayName}</div>
                <div className="truncate text-xs font-semibold text-cyan-100/70">Patient</div>
              </div>
            </div>
            <div className="w-full">
              <PatientSignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="relative min-w-0 overflow-hidden lg:h-screen lg:overflow-y-auto">
        <header className="border-b border-slate-200/70 bg-white/88 backdrop-blur lg:hidden">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="brand-mark h-12 w-12 text-sm font-extrabold">
                  {initials(patient.full_name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-extrabold tracking-tight">
                    {patient.full_name}
                  </div>
                  <div className="truncate text-xs font-semibold text-slate-500">
                    {patientMeta}
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

        <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="hero-card mb-8 px-5 py-5 backdrop-blur sm:px-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#22c7bd]" />
              {todayLabel}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Welcome, {displayName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {clinic?.name || "Patient health portal"}
            </p>
          </section>

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
      className="h-6 w-6"
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
