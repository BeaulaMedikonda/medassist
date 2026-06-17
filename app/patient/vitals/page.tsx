import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, PageHeader, VitalsGrid } from "@/components/patient/PatientCards";
import {
  ServerPagination,
  getPageFromParams,
  paginateServerItems,
  type SearchParamsRecord,
} from "@/components/ui/ServerPagination";
import { formatDate } from "@/lib/utils";
import type { Visit } from "@/types/db";

export const dynamic = "force-dynamic";

function hasVitals(visit: Visit) {
  return Boolean(
    visit.bp_systolic != null ||
      visit.bp_diastolic != null ||
      visit.pulse != null ||
      visit.temperature_f != null ||
      visit.spo2 != null ||
      visit.weight_kg != null,
  );
}

function isLatestNormal(visit: Visit) {
  const checks = [
    visit.pulse != null ? visit.pulse >= 60 && visit.pulse <= 100 : null,
    visit.spo2 != null ? visit.spo2 >= 95 : null,
    visit.temperature_f != null ? visit.temperature_f < 100 : null,
    visit.bp_systolic != null ? visit.bp_systolic <= 140 : null,
    visit.bp_diastolic != null ? visit.bp_diastolic <= 90 : null,
  ].filter((c) => c !== null) as boolean[];
  if (checks.length === 0) return null;
  return checks.every(Boolean);
}

export default async function PatientVitalsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const { patient, clinic } = await requirePatient();
  const supabase = supabaseAdmin();

  const { data } = await supabase
    .from("visits")
    .select("id, visit_date, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg")
    .eq("patient_id", patient.id)
    .order("visit_date", { ascending: false })
    .limit(25);

  const visits = ((data || []) as Array<Omit<Visit, "height_cm">>)
    .map((visit) => ({ ...visit, height_cm: patient.height_cm ?? null }) as Visit)
    .filter(hasVitals);
  const page = getPageFromParams(params);
  const pageData = paginateServerItems(visits, page, 8);
  const latestVisit = visits[0] ?? null;
  const overallNormal = latestVisit ? isLatestNormal(latestVisit) : null;

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Vitals"
        title="My Vitals"
        description="Vitals captured during clinic intake or consultation. Latest readings shown first."
      />

      {visits.length === 0 ? (
        <EmptyState
          label="vitals"
          description="Your clinic will share BP, pulse, SpO2, temperature, and weight after they are recorded during a visit."
        />
      ) : (
        <div className="space-y-5">
          {latestVisit ? <LatestVitalsSnapshot visit={latestVisit} /> : null}

          {/* Latest vitals summary banner */}
          {latestVisit && (
            <div
              className={`flex items-start gap-4 rounded-2xl border p-4 ${
                overallNormal === true
                  ? "border-emerald-200 bg-emerald-50"
                  : overallNormal === false
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
                  overallNormal === true
                    ? "bg-emerald-500"
                    : overallNormal === false
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {overallNormal === true
                    ? <path d="M20 6L9 17l-5-5" />
                    : <path d="M12 9v4M12 17h.01" />}
                </svg>
              </div>
              <div>
                <p className={`text-[13px] font-extrabold ${overallNormal === true ? "text-emerald-800" : overallNormal === false ? "text-amber-800" : "text-slate-700"}`}>
                  {overallNormal === true
                    ? "Latest vitals look normal"
                    : overallNormal === false
                    ? "Some readings outside normal range"
                    : "Latest vitals recorded"}
                </p>
                <p className={`mt-0.5 text-[12px] font-semibold ${overallNormal === true ? "text-emerald-600" : overallNormal === false ? "text-amber-600" : "text-slate-500"}`}>
                  Last recorded on {formatDate(latestVisit.visit_date)}
                </p>
              </div>
            </div>
          )}

          {/* Vitals cards grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            {pageData.pageItems.map((visit, index) => (
              <div
                key={visit.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)]"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    {index === 0 && page === 1 && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-teal-700">
                        Latest
                      </span>
                    )}
                    <h2 className="text-[13px] font-extrabold text-slate-700">
                      {formatDate(visit.visit_date)}
                    </h2>
                  </div>
                </div>
                <div className="p-4">
                  <VitalsGrid visit={visit} />
                </div>
              </div>
            ))}
          </div>

          <div>
            <ServerPagination
              page={pageData.currentPage}
              pageSize={8}
              totalItems={visits.length}
              searchParams={params}
              label="vital records"
            />
          </div>
        </div>
      )}
    </PatientPortalShell>
  );
}

function LatestVitalsSnapshot({ visit }: { visit: Visit }) {
  const items = [
    {
      label: "Blood Pressure",
      value:
        visit.bp_systolic != null || visit.bp_diastolic != null
          ? `${visit.bp_systolic ?? "-"} / ${visit.bp_diastolic ?? "-"}`
          : null,
      unit: "mmHg",
    },
    { label: "Pulse", value: valueText(visit.pulse), unit: "bpm" },
    { label: "SpO2", value: valueText(visit.spo2), unit: "%" },
    { label: "Temperature", value: valueText(visit.temperature_f), unit: "F" },
    { label: "Weight", value: valueText(visit.weight_kg), unit: "kg" },
  ].filter((item) => item.value);

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
            Latest Readings
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">
            Your most recent vitals
          </h2>
        </div>
        <p className="text-[12px] font-semibold text-slate-500">
          Recorded {formatDate(visit.visit_date)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              {item.label}
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-950">
              {item.value}
              <span className="ml-1 text-xs font-bold text-slate-400">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function valueText(value: number | null | undefined) {
  return value == null ? null : String(value);
}
