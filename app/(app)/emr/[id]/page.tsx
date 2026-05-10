import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Patient, Visit } from "@/types/db";
import { formatDate, initials } from "@/lib/utils";
import { VisitTimeline } from "@/components/emr/VisitTimeline";

export const dynamic = "force-dynamic";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await supabaseServer();
  const { id } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!patient) notFound();

  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .eq("patient_id", id)
    .order("visit_date", { ascending: false });

  const p = patient as Patient;
  const v = (visits || []) as Visit[];

  return (
    <div className="pb-24">
      <Link
        href="/emr"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-ink-500 hover:text-slate-900 dark:text-ink-100"
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path
            d="M12 4l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        All patients
      </Link>

      <header className="card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-200 to-brand-100 text-base font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
              {initials(p.full_name)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-ink-100">
                {p.full_name}
              </h1>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-ink-400">
                <span className="font-mono text-xs">{p.emr_number}</span>
                {p.age != null ? (
                  <span>
                    {p.age} y · {p.sex || "—"}
                  </span>
                ) : null}
                {p.phone ? <span>📞 {p.phone}</span> : null}
                {p.blood_group ? <span>🩸 {p.blood_group}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.known_allergies ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800/60">
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>
                    Allergies: {p.known_allergies}
                  </span>
                ) : null}
                {p.chronic_conditions ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800/60">
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>
                    Conditions: {p.chronic_conditions}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-ink-600">
              First visit
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-ink-300">
              {formatDate(p.created_at)}
            </span>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-ink-100">
              Visits ({v.length})
            </h2>
            <p className="text-sm text-slate-500 dark:text-ink-500">
              Most recent first. Tap any visit to view details.
            </p>
          </div>
          <Link
            href={`/emr/${p.id}/visits/new?mode=record`}
            className="btn-secondary hidden sm:inline-flex"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path
                d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm-5 7a5 5 0 0010 0h2a7 7 0 11-14 0h2z"
                fill="currentColor"
              />
            </svg>
            Start recording
          </Link>
        </div>

        <VisitTimeline visits={v} patientId={p.id} />
      </section>

      {/* Mobile FAB */}
      <Link
        href={`/emr/${p.id}/visits/new?mode=record`}
        className="fixed bottom-6 right-6 flex h-14 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 sm:hidden"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5">
          <path
            d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm-5 7a5 5 0 0010 0h2a7 7 0 11-14 0h2z"
            fill="currentColor"
          />
        </svg>
        New visit
      </Link>
    </div>
  );
}
