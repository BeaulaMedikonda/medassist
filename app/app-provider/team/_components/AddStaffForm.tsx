"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "platform_admin", label: "Admin", detail: "Full console access, cannot manage team" },
  { value: "platform_support", label: "Support", detail: "View clinics and patient counts only" },
  { value: "platform_billing", label: "Billing", detail: "View billing and invoices only" },
  { value: "platform_owner", label: "Owner", detail: "Full access including team management" },
];

export function AddStaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("platform_admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/app-provider/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error || "Could not add member");

      setInvited(true);
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setEmail("");
        setFullName("");
        setRole("platform_admin");
        setInvited(false);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f8f83] to-[#0ea5a4] px-4 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5"
      >
        + Add member
      </button>
    );
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-5">
      {invited ? (
        <p className="text-sm font-bold text-teal-700">
          Member added successfully. An invite email was sent if they were new to the platform.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Optional"
              className="h-9 w-40 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
            >
              {ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="h-9 rounded-lg bg-gradient-to-r from-[#0f8f83] to-[#0ea5a4] px-4 text-xs font-black text-white disabled:opacity-60"
            >
              {busy ? "Adding..." : "Add member"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          {error ? <p className="w-full text-xs font-semibold text-rose-600">{error}</p> : null}

          <p className="w-full text-xs text-slate-500">
            {ROLES.find((item) => item.value === role)?.detail} If the email has no account yet, an invite will be
            sent automatically.
          </p>
        </form>
      )}
    </div>
  );
}
