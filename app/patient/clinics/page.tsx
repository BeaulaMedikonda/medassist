import Link from "next/link";
import { hasSupabaseAdminEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ClinicSelector, type ClinicItem } from "./ClinicSelector";

export const dynamic = "force-dynamic";

export default async function PatientClinicSelectionPage() {
  const { data, error } = hasSupabaseAdminEnv
    ? await supabaseAdmin()
        .from("clinics")
        .select("id, name, address, phone, city, state")
        .order("name", { ascending: true })
    : { data: null, error: null };

  const clinics = ((data || []) as ClinicItem[]).filter((c) => c.name?.trim());

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1116 0Z" />
                <path d="M9 10h6M12 7v6" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-extrabold tracking-tight text-slate-900">MedAssist</span>
              <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">Patient Portal</span>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Staff login
          </Link>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
            Patient Portal
          </p>
          <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Select your clinic
          </h1>
          <p className="mt-1.5 max-w-lg text-[13px] font-medium leading-relaxed text-slate-500">
            Choose your clinic below. After selection you&rsquo;ll sign in with your registered mobile number and OTP.
          </p>
        </div>

        {/* ── States ──────────────────────────────────────────────────────── */}
        {!hasSupabaseAdminEnv ? (
          <AlertCard
            tone="amber"
            title="Setup required"
            body="Add Supabase environment variables and restart the dev server so clinics can load here."
          >
            <div className="mt-4 rounded-xl border border-amber-200 bg-white/70 p-4 font-mono text-[11px] text-amber-900 space-y-1">
              <div>NEXT_PUBLIC_SUPABASE_URL</div>
              <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
              <div>SUPABASE_SERVICE_ROLE_KEY</div>
            </div>
          </AlertCard>
        ) : error ? (
          <AlertCard tone="rose" title="Could not load clinics" body={error.message} />
        ) : clinics.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-slate-700">No clinics available yet</p>
              <p className="mt-1 text-[12px] font-medium text-slate-400">
                Create a clinic from the Admin panel and it will appear here.
              </p>
            </div>
          </div>
        ) : (
          <ClinicSelector clinics={clinics} />
        )}

        {/* Footer note */}
        <p className="mt-8 text-center text-[11px] font-semibold text-slate-400">
          Patients can only access the portal of their assigned clinic.
        </p>
      </main>
    </div>
  );
}

function AlertCard({
  tone,
  title,
  body,
  children,
}: {
  tone: "amber" | "rose";
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const colors =
    tone === "amber"
      ? {
          wrap: "border-amber-200 bg-amber-50",
          header: "border-amber-200",
          label: "text-amber-600",
          body: "text-amber-800",
        }
      : {
          wrap: "border-rose-200 bg-rose-50",
          header: "border-rose-200",
          label: "text-rose-600",
          body: "text-rose-700",
        };

  return (
    <div className={`overflow-hidden rounded-2xl border ${colors.wrap}`}>
      <div className={`border-b px-5 py-3.5 ${colors.header}`}>
        <h2 className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${colors.label}`}>
          {title}
        </h2>
      </div>
      <div className="p-5">
        <p className={`text-[13px] font-semibold ${colors.body}`}>{body}</p>
        {children}
      </div>
    </div>
  );
}
