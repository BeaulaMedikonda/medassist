import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, PageHeader, VisitSummaryCard } from "@/components/patient/PatientCards";
import {
  ServerPagination,
  getPageFromParams,
  paginateServerItems,
  type SearchParamsRecord,
} from "@/components/ui/ServerPagination";
import type { Visit } from "@/types/db";
 
export const dynamic = "force-dynamic";
 
export default async function PatientVisitsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const { patient, clinic } = await requirePatient();
  const supabase = supabaseAdmin();
 
  const { data } = await supabase
    .from("visits")
    .select("*")
    .eq("patient_id", patient.id)
    .order("visit_date", { ascending: false })
    .limit(50);
 
  const visits = (data || []) as Visit[];
  const page = getPageFromParams(params);
  const pageData = paginateServerItems(visits, page, 10);
 
  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Visit history"
        title="My Visit Summaries"
        description="Doctor-reviewed summaries, diagnosis, advice, tests, and prescriptions from your clinic visits."
      />
 
      {visits.length === 0 ? (
        <EmptyState
          label="visit summaries"
          description="Your completed visit summaries will appear here after your clinic shares them."
        />
      ) : (
        <div className="space-y-4">
          {pageData.pageItems.map((visit) => (
            <VisitSummaryCard key={visit.id} visit={visit} />
          ))}
          <ServerPagination
            page={pageData.currentPage}
            pageSize={10}
            totalItems={visits.length}
            searchParams={params}
            label="visits"
          />
        </div>
      )}
    </PatientPortalShell>
  );
}
 
 
