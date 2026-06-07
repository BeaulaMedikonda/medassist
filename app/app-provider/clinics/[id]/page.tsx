import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProviderRole } from "@/lib/provider/auth";
import { getClinicDetail } from "@/lib/provider/data";
import {
  DateText,
  Money,
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
import { ClinicLifecycleActions } from "@/app/app-provider/clinics/_components/ApproveClinicButton";

export default async function ProviderClinicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ProviderSearchParams>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const { admin } = await requireProviderRole("clinics");
  const detail = await getClinicDetail(id);
  if (!detail) notFound();

  const canManage = admin.role === "platform_owner" || admin.role === "platform_admin";
  const doctors = detail.staff.filter((row) => row.role === "doctor").length;
  const mas = detail.staff.filter((row) => row.role === "medical_assistant").length;
  const completedVisits = detail.visits.filter((row) => row.status === "completed").length;
  const failedFhir = detail.fhir.filter((row) => row.status === "failed").length;
  const usagePage = getPageFromSearchParams(queryParams, "usagePage");
  const usagePageData = paginateItems(detail.usage, usagePage, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinic detail"
        title={detail.clinic.name}
        description={[detail.clinic.city, detail.clinic.state].filter(Boolean).join(", ") || "Clinic profile location not set."}
        action={
          <div className="flex flex-wrap gap-2">
            <ClinicLifecycleActions
              clinicId={id}
              status={(detail.subscription?.status as string) || "trial"}
              canManage={canManage}
            />
            <Link href={`/app-provider/clinics/${id}/patients`} className="btn-secondary">
              View Patients
            </Link>
          </div>
        }
      />

      <StatGrid>
        <StatCard label="Staff" value={detail.staff.length} detail={`${doctors} doctors, ${mas} MAs`} />
        <StatCard label="Patients" value={detail.patients.length} detail="Total clinic patients" />
        <StatCard label="Visits" value={detail.visits.length} detail={`${completedVisits} completed`} />
        <StatCard label="API cost" value={`INR ${detail.usageCostInr.toFixed(2)}`} detail={`${detail.usage.length} recent calls`} />
        <StatCard label="Appointments" value={detail.appointments.length} detail="Total appointments" />
        <StatCard label="FHIR failures" value={failedFhir} detail={`${detail.fhir.length} validations checked`} />
        <StatCard label="Plan" value={(detail.subscription?.plan_code as string) || "trial"} detail={(detail.subscription?.status as string) || "No subscription row"} />
        <StatCard label="Monthly fee" value={`INR ${Number(detail.subscription?.monthly_fee_inr || 0).toLocaleString("en-IN")}`} detail={(detail.subscription?.payment_status as string) || "Not started"} />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Staff">
          <ProviderTable headers={["Name", "Role", "Email", "Created"]}>
            {detail.staff.map((member) => (
              <tr key={member.id as string} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-black text-slate-950">{member.full_name as string}</td>
                <td className="px-5 py-4"><StatusBadge value={member.role as string} /></td>
                <td className="px-5 py-4 text-slate-600">{(member.email as string) || "Not set"}</td>
                <td className="px-5 py-4"><DateText value={member.created_at} /></td>
              </tr>
            ))}
          </ProviderTable>
        </Panel>

        <Panel title="Feature Flags">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {["pharmacy", "appointments", "patient_portal", "fhir_export", "ai_extraction", "pre_visit_summary", "fax", "multilingual", "immunizations", "referrals"].map((flag) => (
              <div key={flag} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <span className="text-sm font-black capitalize text-slate-700">{flag.replace(/_/g, " ")}</span>
                <StatusBadge value={detail.flags?.[flag] === false ? "inactive" : "active"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent API Usage">
        <ProviderTable headers={["Service", "Operation", "Cost", "Created"]}>
          {usagePageData.items.map((row) => (
            <tr key={row.id as string} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-bold text-slate-800">{row.service as string}</td>
              <td className="px-5 py-4 text-slate-600">{row.operation as string}</td>
              <td className="px-5 py-4"><Money value={Number(row.cost_inr ?? row.cost_usd ?? 0)} /></td>
              <td className="px-5 py-4"><DateText value={row.created_at} time /></td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={usagePageData.currentPage}
          pageSize={20}
          totalItems={detail.usage.length}
          searchParams={queryParams}
          paramName="usagePage"
          label="usage events"
        />
      </Panel>
    </div>
  );
}



