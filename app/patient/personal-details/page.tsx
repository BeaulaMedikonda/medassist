import { requirePatient } from "@/lib/auth-patient";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { PageHeader } from "@/components/patient/PatientCards";
import { PersonalDetailsForm } from "./PersonalDetailsForm";

export const dynamic = "force-dynamic";

export default async function PatientPersonalDetailsPage() {
  const { patient, clinic } = await requirePatient();

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Update details"
        title="Submit Personal Details"
        description="Send updated personal and basic medical details to the clinic. Staff can review the submission before updating the official EMR."
      />

      <PersonalDetailsForm patient={patient} />
    </PatientPortalShell>
  );
}
