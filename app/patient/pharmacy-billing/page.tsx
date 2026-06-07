import { requirePatient } from "@/lib/auth-patient";
import { supabaseServer } from "@/lib/supabase/server";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { DetailGrid, InfoCard, PageHeader } from "@/components/patient/PatientCards";
import type { Medicine, Prescription, Visit } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function PatientPharmacyBillingPage() {
  const { patient, clinic } = await requirePatient();
  const supabase = await supabaseServer();

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, prescription")
    .eq("patient_id", patient.id)
    .order("visit_date", { ascending: false })
    .limit(5);

  const medicines = ((visits || []) as Visit[]).flatMap((visit) => {
    const items = ((visit.prescription as Prescription | null)?.medicines || []) as Medicine[];
    return items.map((medicine) => ({
      name: medicine.name,
      dose: medicine.dose || "-",
      frequency: medicine.frequency || "-",
      duration: medicine.duration || "-",
    }));
  });

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Pharmacy and billing"
        title="Pharmacy & Billing"
        description="Review recently prescribed medicines and billing information shared by the clinic."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <InfoCard title="Recent Medicines">
          {medicines.length ? (
            <div className="space-y-3">
              {medicines.map((medicine, index) => (
                <div key={`${medicine.name}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-extrabold text-slate-900">{medicine.name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {medicine.dose} / {medicine.frequency} / {medicine.duration}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-500">No recent medicines are available yet.</p>
          )}
        </InfoCard>

        <InfoCard title="Billing">
          <DetailGrid
            items={[
              ["Status", "Shared by clinic"],
              ["Insurance", "Not added"],
              ["Outstanding", "Contact clinic"],
              ["Receipts", "Coming soon"],
            ]}
          />
        </InfoCard>
      </div>
    </PatientPortalShell>
  );
}
