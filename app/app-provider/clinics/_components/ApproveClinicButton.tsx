"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LifecycleAction = "approve" | "reject" | "suspend" | "reactivate" | "expire" | "cancel" | "trial";

const ACTION_LABELS: Record<LifecycleAction, string> = {
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend",
  reactivate: "Reactivate",
  expire: "Expire",
  cancel: "Cancel",
  trial: "Move to trial",
};

async function updateLifecycle(clinicId: string, action: LifecycleAction) {
  const res = await fetch(`/api/app-provider/clinics/${clinicId}/lifecycle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Could not update clinic");
  }
}

function ActionButton({
  clinicId,
  action,
  tone = "primary",
}: {
  clinicId: string;
  action: LifecycleAction;
  tone?: "primary" | "danger" | "neutral";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (["reject", "suspend", "cancel"].includes(action)) {
      const confirmed = window.confirm(`Confirm: ${ACTION_LABELS[action]} this clinic?`);
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      await updateLifecycle(clinicId, action);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update clinic");
    } finally {
      setBusy(false);
    }
  }

  const classes =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : tone === "neutral"
        ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        : "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={run}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${classes}`}
    >
      {busy ? "Saving..." : ACTION_LABELS[action]}
    </button>
  );
}

export function ApproveClinicButton({ clinicId, canApprove = true }: { clinicId: string; canApprove?: boolean }) {
  if (!canApprove) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-400 ring-1 ring-slate-200">
        Pending
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton clinicId={clinicId} action="approve" />
      <ActionButton clinicId={clinicId} action="reject" tone="danger" />
    </div>
  );
}

export function ClinicLifecycleActions({
  clinicId,
  status,
  canManage = true,
}: {
  clinicId: string;
  status: string;
  canManage?: boolean;
}) {
  if (!canManage) {
    return <span className="text-xs font-semibold text-slate-400">View only</span>;
  }

  if (status === "pending_approval") {
    return <ApproveClinicButton clinicId={clinicId} canApprove={canManage} />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {["suspended", "expired", "cancelled"].includes(status) ? (
        <ActionButton clinicId={clinicId} action="reactivate" />
      ) : (
        <ActionButton clinicId={clinicId} action="suspend" tone="danger" />
      )}
      {status !== "trial" ? <ActionButton clinicId={clinicId} action="trial" tone="neutral" /> : null}
      {status !== "cancelled" ? <ActionButton clinicId={clinicId} action="cancel" tone="danger" /> : null}
    </div>
  );
}
