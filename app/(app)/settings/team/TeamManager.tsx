"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { initials } from "@/lib/utils";
import type { StaffRole } from "@/types/db";

type Member = {
  id: string;
  full_name: string;
  role: StaffRole;
  qualification: string | null;
};

export function TeamManager({
  inviteCode,
  currentUserId,
  initialMembers,
}: {
  inviteCode: string;
  currentUserId: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "doctor" as StaffRole,
    qualification: "",
    registration_number: "",
  });

  function generatePassword() {
    const charset =
      "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 12; i++) s += charset[Math.floor(Math.random() * charset.length)];
    setForm((f) => ({ ...f, password: s }));
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      push({ title: `Copied ${label}`, variant: "success" });
    } catch {
      push({ title: `Could not copy`, variant: "error" });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        member?: Member;
      };
      if (!res.ok || !j.ok || !j.member) {
        throw new Error(j.error || `Failed (${res.status})`);
      }
      const newMember = j.member;
      push({
        title: "Account created",
        description: `${newMember.full_name} can sign in with ${form.email}`,
        variant: "success",
      });
      setMembers((cur) => [...cur, newMember]);

      // Show credentials persistently for the admin to copy
      window.alert(
        `Account created.\n\nEmail: ${form.email}\nTemp password: ${form.password}\n\nShare these with the team member. They can change the password after signing in.`,
      );

      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "doctor",
        qualification: "",
        registration_number: "",
      });
      setShowAdd(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create account";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="premium-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
              Self-service join
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-ink-500">
              Anyone with the invite code can sign up, pick "Join existing
              clinic", paste this code, and choose Doctor or Medical Assistant. Use this
              for staff who can complete their own onboarding.
            </p>
          </div>
          <button
            onClick={() => copy(inviteCode, "invite code")}
            className="rounded-full bg-brand-50 px-4 py-2 font-mono text-sm font-extrabold tracking-widest text-brand-800 hover:bg-brand-100"
          >
            {inviteCode}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Current team
            </h2>
            <p className="text-xs text-slate-500 dark:text-ink-500">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
          <button onClick={() => setShowAdd((v) => !v)} className="btn-primary">
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {showAdd ? "Cancel" : "Add member"}
          </button>
        </div>

        {showAdd ? (
          <form onSubmit={submit} className="premium-panel mb-4 p-5">
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              You're creating a sign-in account directly. The member will be
              able to log in immediately with the credentials shown after save.
              They can change the password later.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Full name"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Dr. Asha Krishnan"
              />
              <SelectInput
                label="Role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
              >
                <option value="doctor">Doctor</option>
                <option value="medical_assistant">Medical Assistant</option>
                <option value="admin">Admin</option>
              </SelectInput>
              <TextInput
                label="Email"
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="member@clinic.in"
              />
              <div>
                <label className="label">Temp password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="At least 8 chars"
                    className="input-base flex-1 font-mono"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="btn-secondary shrink-0"
                  >
                    Generate
                  </button>
                </div>
              </div>
              {form.role !== "medical_assistant" ? (
                <>
                  <TextInput
                    label="Qualification"
                    value={form.qualification}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, qualification: e.target.value }))
                    }
                    placeholder="MBBS, MD"
                  />
                  <TextInput
                    label="Registration number"
                    value={form.registration_number}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        registration_number: e.target.value,
                      }))
                    }
                  />
                </>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Spinner /> : null}
                Create account
              </button>
            </div>
          </form>
        ) : null}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              currentUserId={currentUserId}
              onRoleChanged={(id, role) =>
                setMembers((cur) =>
                  cur.map((x) => (x.id === id ? { ...x, role } : x)),
                )
              }
              onRemoved={(id, self) => {
                setMembers((cur) => cur.filter((x) => x.id !== id));
                if (self) {
                  // Self-deleted — sign out and bounce to /login.
                  // Use a hard redirect so all client state is cleared.
                  window.location.replace("/login");
                }
              }}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  onRoleChanged,
  onRemoved,
}: {
  member: Member;
  currentUserId: string;
  onRoleChanged: (id: string, role: StaffRole) => void;
  onRemoved: (id: string, self: boolean) => void;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState<"role" | "remove" | null>(null);
  const isSelf = member.id === currentUserId;

  async function changeRole(role: StaffRole) {
    if (role === member.role) return;
    setBusy("role");
    try {
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || `Failed (${res.status})`);
      onRoleChanged(member.id, role);
      push({
        title: "Role updated",
        description: `${member.full_name} → ${prettyRole(role)}`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not change role";
      push({ title: "Role change failed", description: msg, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const label = isSelf ? "your own account" : member.full_name;
    const ok = window.confirm(
      `Remove ${label}?\n\n` +
        `They will no longer be able to sign in. Their historical visits and patients will be preserved.` +
        (isSelf ? "\n\nYou will be signed out immediately." : ""),
    );
    if (!ok) return;
    setBusy("remove");
    try {
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        removed?: { self?: boolean };
      };
      if (!res.ok || !j.ok) throw new Error(j.error || `Failed (${res.status})`);
      push({
        title: isSelf ? "Account removed" : "Member removed",
        description: isSelf ? undefined : `${member.full_name} has been removed.`,
        variant: "success",
      });
      onRemoved(member.id, !!j.removed?.self);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not remove member";
      push({ title: "Remove failed", description: msg, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="premium-panel flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-xs font-semibold text-brand-800">
          {initials(member.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-ink-100">
            {member.role === "doctor" ? "Dr. " : ""}
            {member.full_name}
            {isSelf ? (
              <span className="ml-2 text-[10px] font-normal text-slate-400 dark:text-ink-600">
                (you)
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-ink-500">
            {member.qualification ? `${member.qualification} · ` : ""}
            <RoleBadge role={member.role} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs">
        <label className="flex items-center gap-2 text-slate-500 dark:text-ink-500">
          <span>Role</span>
          <select
            className="input-base !py-1 text-xs"
            value={member.role}
            disabled={busy != null}
            onChange={(e) => changeRole(e.target.value as StaffRole)}
          >
            <option value="doctor">Doctor</option>
            <option value="medical_assistant">Medical Assistant</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          type="button"
          onClick={remove}
          disabled={busy != null}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          aria-label={`Remove ${member.full_name}`}
        >
          {busy === "remove" ? <Spinner /> : (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
              <path
                d="M6 4l1-1h6l1 1h3v2H3V4h3zm-1 3h10l-1 10H6L5 7zm3 2v6h2V9H8zm4 0v6h2V9h-2z"
                fill="currentColor"
              />
            </svg>
          )}
          Remove
        </button>
      </div>
    </li>
  );
}

function prettyRole(role: StaffRole): string {
  if (role === "admin") return "Admin";
  if (role === "medical_assistant") return "Medical Assistant";
  return "Doctor";
}

function RoleBadge({ role }: { role: StaffRole }) {
  const tone =
    role === "admin"
      ? "bg-amber-100 text-amber-800"
      : role === "medical_assistant"
        ? "bg-sky-100 text-sky-800"
        : "bg-brand-100 text-brand-800";
  const label = role === "medical_assistant" ? "MA" : role;
  return (
    <span
      className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
