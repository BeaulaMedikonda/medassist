import { requirePatient } from "@/lib/auth-patient";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { PatientProfileForm } from "./PatientProfileForm";

export const dynamic = "force-dynamic";

export default async function PatientProfilePage() {
  const { patient, clinic } = await requirePatient();

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PatientProfileForm patient={patient} />
    </PatientPortalShell>
  );
}
