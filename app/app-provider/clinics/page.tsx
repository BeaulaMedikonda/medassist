import { requireProviderRole } from "@/lib/provider/auth";
import { getClinicSummaries, getPendingClinics } from "@/lib/provider/data";
import {
  DateText,
  DetailLink,
  Money,
  PageHeader,
  Panel,
  ProviderPagination,
  type ProviderSearchParams,
  ProviderTable,
  StatusBadge,
  getPageFromSearchParams,
  paginateItems,
} from "@/app/app-provider/_components/ProviderUi";
import { ApproveClinicButton, ClinicLifecycleActions } from "@/app/app-provider/clinics/_components/ApproveClinicButton";

export default async function ProviderClinicsPage({
  searchParams,
}: {
  searchParams?: Promise<ProviderSearchParams>;
}) {
  const { admin } = await requireProviderRole("clinics");
  const params = await searchParams;
  const canApprove = admin.role === "platform_owner" || admin.role === "platform_admin";
  const [clinics, pending] = await Promise.all([getClinicSummaries(), getPendingClinics()]);
  const pendingPage = getPageFromSearchParams(params, "pendingPage");
  const clinicsPage = getPageFromSearchParams(params, "clinicsPage");
  const pendingPageData = paginateItems(pending, pendingPage, 10);
  const clinicsPageData = paginateItems(clinics, clinicsPage, 25);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinic operations"
        title="Clinic Management"
        description="All clinics on the platform with plan, usage, staff, patient volume, and billing status."
      />

      {pending.length > 0 ? (
        <Panel title={`${pending.length} Pending Approval`}>
          <ProviderTable headers={["Clinic", "Admin", "Contact", "Registered", "Action"]}>
            {pendingPageData.items.map((clinic) => (
              <tr key={clinic.id} className="hover:bg-amber-50/50">
                <td className="px-5 py-4">
                  <div className="font-black text-slate-950">{clinic.name}</div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  {clinic.adminName || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {clinic.adminEmail || clinic.phone || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-4"><DateText value={clinic.created_at} /></td>
                <td className="px-5 py-4">
                  <ApproveClinicButton clinicId={clinic.id} canApprove={canApprove} />
                </td>
              </tr>
            ))}
          </ProviderTable>
          <ProviderPagination
            page={pendingPageData.currentPage}
            pageSize={10}
            totalItems={pending.length}
            searchParams={params}
            paramName="pendingPage"
            label="pending clinics"
          />
        </Panel>
      ) : null}

      <Panel title={`${clinics.length} Clinics`}>
        <ProviderTable headers={["Clinic", "Status", "Plan", "Billing", "Staff", "Patients", "Visits", "Last Activity", "Lifecycle", ""]}>
          {clinicsPageData.items.map((clinic) => (
            <tr key={clinic.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="font-black text-slate-950">{clinic.name}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {[clinic.city, clinic.state].filter(Boolean).join(", ") || clinic.email || "Profile incomplete"}
                </div>
              </td>
              <td className="px-5 py-4"><StatusBadge value={clinic.status} /></td>
              <td className="px-5 py-4 text-sm font-bold text-slate-700">{clinic.plan}</td>
              <td className="px-5 py-4">
                <div><StatusBadge value={clinic.paymentStatus} /></div>
                <div className="mt-2 text-xs"><Money value={clinic.monthlyFeeInr} /></div>
              </td>
              <td className="px-5 py-4 text-slate-700">{clinic.doctors + clinic.medicalAssistants}</td>
              <td className="px-5 py-4 text-slate-700">{clinic.patients}</td>
              <td className="px-5 py-4 text-slate-700">{clinic.visits}</td>
              <td className="px-5 py-4"><DateText value={clinic.lastActivity} time /></td>
              <td className="px-5 py-4">
                <ClinicLifecycleActions clinicId={clinic.id} status={clinic.status} canManage={canApprove} />
              </td>
              <td className="px-5 py-4"><DetailLink href={`/app-provider/clinics/${clinic.id}`} /></td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={clinicsPageData.currentPage}
          pageSize={25}
          totalItems={clinics.length}
          searchParams={params}
          paramName="clinicsPage"
          label="clinics"
        />
      </Panel>
    </div>
  );
}
