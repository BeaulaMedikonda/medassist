import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinicPatients } from "@/lib/provider/data";
import {
  DateText,
  PageHeader,
  Panel,
  ProviderPagination,
  type ProviderSearchParams,
  ProviderTable,
  StatCard,
  StatGrid,
  StatusBadge,
  getPageFromSearchParams,
  paginateItems,
} from "@/app/app-provider/_components/ProviderUi";

export default async function SuperAdminClinicPatientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ProviderSearchParams>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const detail = await getClinicPatients(id);
  if (!detail) notFound();

  const page = getPageFromSearchParams(queryParams);
  const pageData = paginateItems(detail.patients, page, 25);
  const patientsWithVisits = detail.patients.filter((patient) => patient.visitCount > 0).length;
  const totalVisits = detail.patients.reduce((sum, patient) => sum + patient.visitCount, 0);
  const completedVisits = detail.patients.reduce((sum, patient) => sum + patient.completedVisitCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinic patients"
        title={`${detail.clinic.name} Patients`}
        description="Read-only app provider view of patients registered under this clinic."
        action={
          <Link href={`/app-provider/clinics/${id}`} className="btn-secondary">
            Back to Clinic
          </Link>
        }
      />

      <StatGrid>
        <StatCard label="Patients" value={detail.patients.length} detail="Registered under this clinic" />
        <StatCard label="Patients with visits" value={patientsWithVisits} detail="At least one visit recorded" />
        <StatCard label="Total visits" value={totalVisits} detail={`${completedVisits} completed`} />
        <StatCard label="View mode" value="Read-only" detail="No patient edits from app provider" />
      </StatGrid>

      <Panel title="Patient List">
        <ProviderTable
          headers={[
            "EMR",
            "Patient",
            "Age / Sex",
            "Contact",
            "Assigned Doctor",
            "Visits",
            "Last Visit",
            "Created",
          ]}
        >
          {pageData.items.map((patient) => (
            <tr key={patient.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-mono text-xs font-black text-slate-700">
                {(patient.emr_number as string) || "-"}
              </td>
              <td className="px-5 py-4">
                <div className="font-black text-slate-950">{patient.full_name as string}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {[patient.city, patient.state].filter(Boolean).join(", ") || "Location not set"}
                </div>
              </td>
              <td className="px-5 py-4 text-slate-700">
                {patient.age ? `${patient.age} yrs` : "Age -"} / {(patient.sex as string) || "-"}
              </td>
              <td className="px-5 py-4">
                <div className="text-sm font-semibold text-slate-700">{(patient.phone as string) || "-"}</div>
                <div className="mt-1 text-xs text-slate-500">{(patient.email as string) || ""}</div>
              </td>
              <td className="px-5 py-4 text-slate-700">
                {patient.assignedDoctorName || "Not assigned"}
              </td>
              <td className="px-5 py-4">
                <StatusBadge value={`${patient.visitCount} visits`} />
              </td>
              <td className="px-5 py-4">
                <DateText value={patient.latestVisit || patient.last_visit_at} time />
              </td>
              <td className="px-5 py-4">
                <DateText value={patient.created_at} />
              </td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={pageData.currentPage}
          pageSize={25}
          totalItems={detail.patients.length}
          searchParams={queryParams}
          label="patients"
        />
      </Panel>
    </div>
  );
}

