import { requirePatient } from "@/lib/auth-patient";
import { supabaseServer } from "@/lib/supabase/server";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, InfoCard, PageHeader, VitalsGrid } from "@/components/patient/PatientCards";
import {
  ServerPagination,
  getPageFromParams,
  paginateServerItems,
  type SearchParamsRecord,
} from "@/components/ui/ServerPagination";
import { formatDate } from "@/lib/utils";
import type { Visit } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function PatientVitalsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const { patient, clinic } = await requirePatient();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("visits")
    .select("id, visit_date, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg, height_cm")
    .eq("patient_id", patient.id)
    .order("visit_date", { ascending: false })
    .limit(25);

  const visits = ((data || []) as Visit[]).filter(hasVitals);
  const page = getPageFromParams(params);
  const pageData = paginateServerItems(visits, page, 8);

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Vitals"
        title="My Vitals"
        description="Optional vitals captured during clinic intake or consultation. These are read from existing visit records."
      />

      {visits.length === 0 ? (
        <EmptyState label="vitals" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pageData.pageItems.map((visit) => (
            <InfoCard key={visit.id} title={`Recorded on ${formatDate(visit.visit_date)}`}>
              <VitalsGrid visit={visit} />
            </InfoCard>
          ))}
          <div className="lg:col-span-2">
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

function hasVitals(visit: Visit) {
  return Boolean(
    visit.bp_systolic ||
      visit.bp_diastolic ||
      visit.pulse ||
      visit.temperature_f ||
      visit.spo2 ||
      visit.weight_kg ||
      visit.height_cm,
  );
}
