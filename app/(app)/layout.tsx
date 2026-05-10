import { requireMember } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { member, clinic, email } = await requireMember();

  return (
    <AppShell
      userName={member.full_name}
      clinicName={clinic.name}
      inviteCode={clinic.invite_code}
      role={member.role}
      email={email}
    >
      {children}
    </AppShell>
  );
}
