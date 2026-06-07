import { revalidatePath } from "next/cache";
import { requirePlatformAdmin, requireProviderRole } from "@/lib/provider/auth";
import { logProviderAudit } from "@/lib/provider/audit";
import { getBillingRows } from "@/lib/provider/data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DateText,
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

async function updateSubscription(formData: FormData) {
  "use server";
  const { userId } = await requirePlatformAdmin();

  const clinicId = String(formData.get("clinic_id") || "");
  if (!clinicId) return;

  const nextSubscription = {
    clinic_id: clinicId,
    plan_code: String(formData.get("plan_code") || "trial"),
    status: String(formData.get("status") || "trial"),
    payment_status: String(formData.get("payment_status") || "not_started"),
    monthly_fee_inr: Number(formData.get("monthly_fee_inr") || 0),
  };

  await supabaseAdmin().from("clinic_subscriptions").upsert(
    nextSubscription as never,
    { onConflict: "clinic_id" },
  );

  await logProviderAudit({
    actorId: userId,
    action: "clinic_billing_updated",
    entityType: "clinic",
    entityId: clinicId,
    metadata: nextSubscription,
  });

  revalidatePath("/app-provider");
  revalidatePath("/app-provider/billing");
  revalidatePath("/app-provider/clinics");
  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  revalidatePath("/pharmacy");
}

export default async function ProviderBillingPage({
  searchParams,
}: {
  searchParams?: Promise<ProviderSearchParams>;
}) {
  const { admin } = await requireProviderRole("billing");
  const params = await searchParams;
  const canEdit = admin.role === "platform_owner" || admin.role === "platform_admin";
  const clinics = await getBillingRows();
  const page = getPageFromSearchParams(params);
  const pageData = paginateItems(clinics, page, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue operations"
        title="Clinic Billing"
        description="Set basic plan, subscription status, payment status, and monthly fee per clinic."
      />

      <Panel title="Subscriptions">
        <ProviderTable headers={["Clinic", "Plan", "Subscription", "Payment", "Monthly Fee", "Created", "Update"]}>
          {pageData.items.map((clinic) => (
            <tr key={clinic.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="font-black text-slate-950">{clinic.name}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {[clinic.city, clinic.state].filter(Boolean).join(", ") || "Location not set"}
                </div>
              </td>
              <td className="px-5 py-4"><StatusBadge value={clinic.plan} /></td>
              <td className="px-5 py-4"><StatusBadge value={clinic.status} /></td>
              <td className="px-5 py-4"><StatusBadge value={clinic.paymentStatus} /></td>
              <td className="px-5 py-4"><Money value={clinic.monthlyFeeInr} /></td>
              <td className="px-5 py-4"><DateText value={clinic.created_at} /></td>
              <td className="px-5 py-4">
                {!canEdit ? <span className="text-xs font-semibold text-slate-400">View only</span> : null}
                <form action={canEdit ? updateSubscription : undefined} className="grid min-w-[420px] grid-cols-5 gap-2">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <select name="plan_code" defaultValue={clinic.plan} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold">
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <select name="status" defaultValue={clinic.status} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold">
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past due</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select name="payment_status" defaultValue={clinic.paymentStatus} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold">
                    <option value="not_started">Not started</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                    <option value="waived">Waived</option>
                  </select>
                  <input
                    name="monthly_fee_inr"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={clinic.monthlyFeeInr}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold"
                  />
                  <button
                    disabled={!canEdit}
                    className="rounded-md bg-slate-950 px-3 py-1 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={pageData.currentPage}
          pageSize={20}
          totalItems={clinics.length}
          searchParams={params}
          label="subscriptions"
        />
      </Panel>
    </div>
  );
}
