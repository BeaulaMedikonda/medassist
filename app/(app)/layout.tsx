// 


import { requireMember } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ClinicAccessBlocked } from "@/components/ClinicAccessBlocked";
import { ClinicPendingApproval } from "@/components/ClinicPendingApproval";
import { ToastProvider } from "@/components/ui/Toast";
import { getClinicSubscriptionState, isClinicAccessBlocked, isClinicPendingApproval } from "@/lib/clinic-subscription";
import { getClinicFeatureFlags } from "@/lib/features";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, clinic, email } = await requireMember();
  const [featureFlags, subscription] = await Promise.all([
    getClinicFeatureFlags(clinic.id),
    getClinicSubscriptionState(clinic.id),
  ]);

  const isMaOrAdmin = member.role === "medical_assistant" || member.role === "admin";
  const portalEnabled = featureFlags?.patient_portal !== false;
  let portalRequestCount = 0;
  if (isMaOrAdmin && portalEnabled) {
    const { count } = await supabaseAdmin()
      .from("patient_portal_intake_submissions")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinic.id)
      .eq("status", "submitted");
    portalRequestCount = count ?? 0;
  }
  const pending = isClinicPendingApproval(subscription);
  const blocked = isClinicAccessBlocked(subscription);

  return (
    <ToastProvider>
      <AppShell
        userName={member.full_name}
        clinicName={clinic.name}
        inviteCode={clinic.invite_code}
        role={member.role}
        email={email}
        featureFlags={featureFlags}
        subscription={subscription}
        portalRequestCount={portalRequestCount}
      >
        {pending ? (
          <ClinicPendingApproval clinicName={clinic.name} />
        ) : blocked ? (
          <ClinicAccessBlocked clinicName={clinic.name} subscription={subscription} />
        ) : (
          children
        )}
      </AppShell>
    </ToastProvider>
  );
}
