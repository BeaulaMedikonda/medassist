import Link from "next/link";
import { requirePatient } from "@/lib/auth-patient";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { InfoCard, PageHeader } from "@/components/patient/PatientCards";

export const dynamic = "force-dynamic";

export default async function PatientMedicalRecordsPage() {
  const { patient, clinic } = await requirePatient();

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Medical records"
        title="Medical Records"
        description="Open your clinic-shared profile, visit summaries, reports, and updated health details from one place."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortalLinkCard href="/patient/profile" title="Profile" detail="Personal details, EMR number, blood group, and contact information." />
        <PortalLinkCard href="/patient/visits" title="Visit History" detail="Doctor notes, diagnosis, advice, investigations, and prescriptions." />
        <PortalLinkCard href="/patient/reports" title="Reports" detail="Clinic-shared reports, prescriptions, and supporting medical files." />
        <PortalLinkCard href="/patient/personal-details" title="Update Details" detail="Send corrected personal or medical details for staff review." />
      </div>
    </PatientPortalShell>
  );
}

function PortalLinkCard({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <InfoCard title={title}>
      <p className="min-h-[72px] text-sm font-semibold leading-6 text-slate-500">{detail}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#0f8f83] px-4 text-sm font-extrabold text-white transition hover:bg-[#0c7f76]"
      >
        Open
      </Link>
    </InfoCard>
  );
}
