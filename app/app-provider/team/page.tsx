import { getProviderStaff } from "@/lib/provider/data";
import { requireProviderRole } from "@/lib/provider/auth";
import {
  DateText,
  PageHeader,
  Panel,
  ProviderTable,
} from "@/app/app-provider/_components/ProviderUi";
import { AddStaffForm } from "@/app/app-provider/team/_components/AddStaffForm";
import { StaffRoleSelect, StaffStatusToggle } from "@/app/app-provider/team/_components/StaffActions";

const ROLE_LABELS: Record<string, string> = {
  platform_owner: "Owner",
  platform_admin: "Admin",
  platform_support: "Support",
  platform_billing: "Billing",
};

const ACCESS_DETAIL: Record<string, string> = {
  platform_owner: "Full access - team management",
  platform_admin: "Full console - no team management",
  platform_support: "View clinics & patients",
  platform_billing: "View billing & invoices",
};

export default async function ProviderTeamPage() {
  const { userId, admin: caller } = await requireProviderRole("team");
  const isOwner = caller.role === "platform_owner";
  const staff = await getProviderStaff();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Provider operations"
        title="App Provider Team"
        description="Manage who has access to the App Provider console and what they can do."
      />

      <Panel
        title={`${staff.length} Team member${staff.length === 1 ? "" : "s"}`}
        action={isOwner ? <AddStaffForm /> : undefined}
      >
        <ProviderTable
          headers={["Member", "Role", "Access", "Status", "Added", ...(isOwner ? ["Actions"] : [])]}
        >
          {staff.map((member) => {
            const isSelf = member.auth_user_id === userId;
            const isActive = member.status === "active";

            return (
              <tr key={member.id} className={`hover:bg-slate-50 ${!isActive ? "opacity-50" : ""}`}>
                <td className="px-5 py-4">
                  <div className="font-black text-slate-950">{member.full_name || "-"}</div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">{member.email}</div>
                </td>

                <td className="px-5 py-4">
                  {isOwner && !isSelf ? (
                    <StaffRoleSelect memberId={member.id} currentRole={member.role} />
                  ) : (
                    <span className="text-sm font-bold text-slate-700">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                  {ACCESS_DETAIL[member.role] ?? "-"}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ring-1 ${
                      isActive
                        ? "bg-teal-50 text-teal-700 ring-teal-200"
                        : "bg-slate-100 text-slate-500 ring-slate-200"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <DateText value={member.created_at} />
                </td>

                {isOwner ? (
                  <td className="px-5 py-4">
                    <StaffStatusToggle
                      memberId={member.id}
                      currentStatus={member.status}
                      isSelf={isSelf}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </ProviderTable>
      </Panel>

      {!isOwner ? (
        <p className="text-center text-sm font-semibold text-slate-400">
          Only the platform owner can add or modify team members.
        </p>
      ) : null}
    </div>
  );
}
