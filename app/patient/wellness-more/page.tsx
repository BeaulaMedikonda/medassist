import Link from "next/link";
import { requirePatient } from "@/lib/auth-patient";
import { supabaseServer } from "@/lib/supabase/server";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { DetailGrid, InfoCard, PageHeader, VitalsGrid } from "@/components/patient/PatientCards";
import type { Visit } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function PatientWellnessMorePage() {
  const { patient, clinic } = await requirePatient();
  const supabase = await supabaseServer();

  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .eq("patient_id", patient.id)
    .order("visit_date", { ascending: false })
    .limit(5);

  const latestVitals = ((visits || []) as Visit[]).find(hasVitals) || null;

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Wellness and more"
        title="Wellness & More"
        description="Track latest vitals, appointments, and useful wellness information shared through the patient portal."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Latest Vitals">
          <VitalsGrid visit={latestVitals} />
          <Link
            href="/patient/vitals"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#0f8f83] px-4 text-sm font-extrabold text-white transition hover:bg-[#0c7f76]"
          >
            View all vitals
          </Link>
        </InfoCard>

        <InfoCard title="Wellness Links">
          <DetailGrid
            items={[
              ["Appointments", "Clinic assigned"],
              ["Follow-ups", "Shown in visit history"],
              ["Lifestyle Notes", "Coming soon"],
              ["Preventive Care", "Coming soon"],
            ]}
          />
        </InfoCard>
      </div>
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
