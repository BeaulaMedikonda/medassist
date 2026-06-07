"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  platform_owner: "Owner",
  platform_admin: "Admin",
  platform_support: "Support",
  platform_billing: "Billing",
};

const ALL_ROLES = ["platform_owner", "platform_admin", "platform_support", "platform_billing"];

export function StaffRoleSelect({ memberId, currentRole }: { memberId: string; currentRole: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function changeRole(newRole: string) {
    if (newRole === currentRole) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/app-provider/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error || "Could not update role");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={currentRole}
      disabled={busy}
      onChange={(event) => changeRole(event.target.value)}
      className="h-7 rounded-full border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none focus:border-teal-400 disabled:opacity-60"
    >
      {ALL_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

export function StaffStatusToggle({
  memberId,
  currentStatus,
  isSelf,
}: {
  memberId: string;
  currentStatus: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isActive = currentStatus === "active";

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/app-provider/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isActive ? "inactive" : "active" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error || "Could not update status");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (isSelf) {
    return (
      <span className="inline-flex rounded-full bg-teal-50 px-2 py-1 text-[11px] font-black text-teal-700 ring-1 ring-teal-200">
        You
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={`inline-flex h-7 items-center rounded-full px-3 text-[11px] font-black ring-1 transition disabled:opacity-60 ${
        isActive
          ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
          : "bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100"
      }`}
    >
      {busy ? "..." : isActive ? "Deactivate" : "Reactivate"}
    </button>
  );
}
