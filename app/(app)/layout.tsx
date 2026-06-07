// 


import { requireMember } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ClinicAccessBlocked } from "@/components/ClinicAccessBlocked";
import { ClinicPendingApproval } from "@/components/ClinicPendingApproval";
import { getClinicSubscriptionState, isClinicAccessBlocked, isClinicPendingApproval } from "@/lib/clinic-subscription";
import { getClinicFeatureFlags } from "@/lib/features";

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
  const pending = isClinicPendingApproval(subscription);
  const blocked = isClinicAccessBlocked(subscription);

  return (
    <AppShell
      userName={member.full_name}
      clinicName={clinic.name}
      inviteCode={clinic.invite_code}
      role={member.role}
      email={email}
      featureFlags={featureFlags}
      subscription={subscription}
    >
      {pending ? (
        <ClinicPendingApproval clinicName={clinic.name} />
      ) : blocked ? (
        <ClinicAccessBlocked clinicName={clinic.name} subscription={subscription} />
      ) : (
        children
      )}
    </AppShell>
  );
}
