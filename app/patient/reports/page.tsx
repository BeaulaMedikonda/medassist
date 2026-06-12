import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, PageHeader } from "@/components/patient/PatientCards";
import {
  ServerPagination,
  getPageFromParams,
  paginateServerItems,
  type SearchParamsRecord,
} from "@/components/ui/ServerPagination";
import { formatDate } from "@/lib/utils";
import type { Medicine, Prescription, Visit } from "@/types/db";
 
export const dynamic = "force-dynamic";
 
export default async function PatientReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const { patient, clinic } = await requirePatient();
  const supabase = supabaseAdmin();
 
  const { data } = await supabase
    .from("visits")
    .select("id, visit_date, investigations_ordered, prescription, advice, follow_up_date")
    .eq("patient_id", patient.id)
    .order("visit_date", { ascending: false })
    .limit(50);
 
  const reports = ((data || []) as Visit[]).filter((visit) => {
    const meds = ((visit.prescription as Prescription | null)?.medicines || []) as Medicine[];
    return Boolean(visit.investigations_ordered || visit.advice || meds.length);
  });
  const page = getPageFromParams(params);
  const pageData = paginateServerItems(reports, page, 10);
 
  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Reports"
        title="Prescriptions & Reports"
        description="Prescription, investigation, and advice records generated from clinic visit summaries."
      />
 
      {reports.length === 0 ? (
        <EmptyState label="reports or prescriptions" />
      ) : (
        <div className="space-y-4">
          {pageData.pageItems.map((visit) => {
            const medicines = ((visit.prescription as Prescription | null)?.medicines || []) as Medicine[];
 
            return (
              <article key={visit.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-950">
                      Visit Report - {formatDate(visit.visit_date)}
                    </h2>
                    {visit.follow_up_date ? (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Follow-up: {formatDate(visit.follow_up_date)}
                      </p>
                    ) : null}
                  </div>
                </div>
 
                {visit.investigations_ordered ? (
                  <ReportBlock title="Investigations" value={visit.investigations_ordered} />
                ) : null}
 
                {visit.advice ? <ReportBlock title="Advice" value={visit.advice} /> : null}
 
                {medicines.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                      Prescription
                    </div>
                    <div className="mt-3 space-y-2">
                      {medicines.map((medicine, index) => (
                        <div key={`${medicine.name}-${index}`} className="text-sm font-semibold text-slate-800">
                          {medicine.name}
                          {medicine.dose ? ` - ${medicine.dose}` : ""}
                          {medicine.frequency ? ` - ${medicine.frequency}` : ""}
                          {medicine.duration ? ` - ${medicine.duration}` : ""}
                          {medicine.instructions ? ` - ${medicine.instructions}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
          <ServerPagination
            page={pageData.currentPage}
            pageSize={10}
            totalItems={reports.length}
            searchParams={params}
            label="reports"
          />
        </div>
      )}
    </PatientPortalShell>
  );
}
 
function ReportBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
