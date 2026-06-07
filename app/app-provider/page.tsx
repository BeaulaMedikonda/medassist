import Link from "next/link";
import { getClinicSummaries, getProviderStats } from "@/lib/provider/data";
import {
  DateText,
  DetailLink,
  Money,
  PageHeader,
  Panel,
  ProviderTable,
  StatCard,
  StatGrid,
  StatusBadge,
} from "@/app/app-provider/_components/ProviderUi";

export default async function ProviderDashboardPage() {
  const [stats, clinics] = await Promise.all([getProviderStats(), getClinicSummaries()]);
  const recentClinics = clinics.slice(0, 6);
  const actionItems = [
    {
      label: "Pending clinic approvals",
      value: stats.pendingClinics,
      href: "/app-provider/clinics",
      tone: stats.pendingClinics > 0 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200",
    },
    {
      label: "Unpaid clinics",
      value: stats.unpaidClinics,
      href: "/app-provider/billing",
      tone: stats.unpaidClinics > 0 ? "text-rose-700 bg-rose-50 border-rose-200" : "text-slate-600 bg-slate-50 border-slate-200",
    },
    {
      label: "Blocked clinics",
      value: stats.blockedClinics,
      href: "/app-provider/clinics",
      tone: stats.blockedClinics > 0 ? "text-rose-700 bg-rose-50 border-rose-200" : "text-slate-600 bg-slate-50 border-slate-200",
    },
    {
      label: "API cost this month",
      value: `INR ${stats.monthlyApiCostInr.toFixed(2)}`,
      href: "/app-provider/usage",
      tone: stats.monthlyApiCostInr > 1000 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform overview"
        title="App Provider Dashboard"
        description="Monitor clinics, business volume, billing risk, and AI/API spend across the MedAssist platform."
        action={
          <Link href="/app-provider/clinics" className="btn-secondary">
            View Clinics
          </Link>
        }
      />

      <StatGrid>
        <StatCard label="Total clinics" value={stats.totalClinics} detail={`${stats.activeClinics} active or trial`} />
        <StatCard label="Pending approval" value={stats.pendingClinics} detail="Clinics waiting for provider review" />
        <StatCard label="Blocked clinics" value={stats.blockedClinics} detail="Expired, suspended, or cancelled" />
        <StatCard label="Unpaid clinics" value={stats.unpaidClinics} detail="Billing attention needed" />
        <StatCard label="Clinic staff" value={stats.doctors + stats.medicalAssistants} detail={`${stats.doctors} doctors, ${stats.medicalAssistants} MAs`} />
        <StatCard label="Patients" value={stats.patients} detail={`${stats.visits} total visits`} />
        <StatCard label="Monthly visits" value={stats.monthlyVisits} detail={`${stats.appointments} appointments total`} />
        <StatCard label="Monthly revenue" value={`INR ${stats.monthlyRevenueInr.toLocaleString("en-IN")}`} detail={`${stats.unpaidClinics} unpaid clinics`} />
        <StatCard label="API cost this month" value={`INR ${stats.monthlyApiCostInr.toFixed(2)}`} detail={`${stats.apiCallsThisMonth} tracked calls`} />
      </StatGrid>

      <Panel title="Action Required">
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {actionItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${item.tone}`}
            >
              <div className="text-xs font-black uppercase tracking-wide">{item.label}</div>
              <div className="mt-2 text-2xl font-black">{item.value}</div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Recent Clinics" action={<Link href="/app-provider/clinics" className="text-xs font-black text-cyan-700">All clinics</Link>}>
        <ProviderTable headers={["Clinic", "Status", "Plan", "Staff", "Patients", "Visits", "Last Activity", ""]}>
          {recentClinics.map((clinic) => (
            <tr key={clinic.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="font-black text-slate-950">{clinic.name}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {[clinic.city, clinic.state].filter(Boolean).join(", ") || "Location not set"}
                </div>
              </td>
              <td className="px-5 py-4"><StatusBadge value={clinic.status} /></td>
              <td className="px-5 py-4 text-slate-700">{clinic.plan}</td>
              <td className="px-5 py-4 text-slate-700">{clinic.doctors + clinic.medicalAssistants}</td>
              <td className="px-5 py-4 text-slate-700">{clinic.patients}</td>
              <td className="px-5 py-4 text-slate-700">{clinic.visits}</td>
              <td className="px-5 py-4"><DateText value={clinic.lastActivity} time /></td>
              <td className="px-5 py-4"><DetailLink href={`/app-provider/clinics/${clinic.id}`} /></td>
            </tr>
          ))}
        </ProviderTable>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Billing Snapshot">
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <span className="text-sm font-bold text-slate-600">Expected monthly revenue</span>
              <Money value={stats.monthlyRevenueInr} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <span className="text-sm font-bold text-slate-600">Current month API cost</span>
              <Money value={Number(stats.monthlyApiCostInr.toFixed(2))} />
            </div>
          </div>
        </Panel>

        <Panel title="MVP Controls">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Link href="/app-provider/clinics" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              Clinic Approval & Lifecycle
            </Link>
            <Link href="/app-provider/usage" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              API Usage & Cost
            </Link>
            <Link href="/app-provider/features" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              Feature Flags
            </Link>
            <Link href="/app-provider/billing" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              Billing
            </Link>
            <Link href="/app-provider/system" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              System Health
            </Link>
            <Link href="/app-provider/team" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              App Provider Team
            </Link>
            <Link href="/app-provider/audit" className="rounded-lg border border-slate-200 p-4 text-sm font-black text-slate-800 hover:bg-slate-50">
              Audit & Security
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}



