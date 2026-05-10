import { requireMember } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";
import { ClinicSettingsForm } from "./ClinicSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { member, clinic, email } = await requireMember();
  const isAdmin = member.role === "admin";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-ink-500">
          {isAdmin
            ? "Manage your profile, clinic details, and team invite code."
            : "Manage your profile, signature and letterhead."}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
          My profile
        </h2>
        <SettingsForm
          doctor={member}
          email={email}
          clinicName={clinic.name}
          inviteCode={clinic.invite_code}
        />
      </section>

      {isAdmin ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
            Clinic
          </h2>
          <ClinicSettingsForm clinic={clinic} />
        </section>
      ) : null}
    </div>
  );
}
