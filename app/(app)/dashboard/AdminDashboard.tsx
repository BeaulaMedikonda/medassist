"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Appointment, Clinic, Doctor, Patient, Visit } from "@/types/db";

type AdminTab =
  | "dashboard"
  | "team"
  | "clinic"
  | "documents"
  | "audit";

type RosterMember = Pick<
  Doctor,
  "id" | "full_name" | "qualification" | "role"
>;

type AdminDashboardProps = {
  member: Doctor;
  clinic: Clinic;
  todayVisits: Visit[];
  awaitingVisits: Visit[];
  patientById: Record<string, Patient>;
  assignments: Array<{ visit_id: string; doctor_id: string; role: string }>;
  doctorById: Record<string, RosterMember>;
  roster: RosterMember[];
  todayAppointments: Appointment[];
  totalPatients: number;
  monthlyDrafts: number;
};

const ADMIN_TEAM_PAGE_SIZE = 8;

export function AdminDashboard({
  member,
  clinic,
  todayVisits,
  awaitingVisits,
  roster,
  todayAppointments,
  totalPatients,
  monthlyDrafts,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [teamMembers, setTeamMembers] = useState(roster);
  const [showInviteStaff, setShowInviteStaff] = useState(false);
  const [inviteCode, setInviteCode] = useState(clinic.invite_code);
  const [regenerating, setRegenerating] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const router = useRouter();
  const { push } = useToast();

  const [clinicForm, setClinicForm] = useState({
    name: clinic.name || "",
    city: clinic.city || "",
    state: clinic.state || "",
    phone: clinic.phone || "",
    email: clinic.email || "",
    address: clinic.address || "",
  });

  const counts = useMemo(() => {
    const doctors = teamMembers.filter((r) => r.role === "doctor").length;
    const assistants = teamMembers.filter((r) => r.role === "medical_assistant").length;
    const admins = teamMembers.filter((r) => r.role === "admin").length;
    const completed = todayVisits.filter((v) => v.status === "completed").length;
    const active = todayVisits.filter((v) =>
      ["intake", "queued", "in_progress", "awaiting_review"].includes(v.status),
    ).length;

    return { doctors, assistants, admins, completed, active };
  }, [teamMembers, todayVisits]);

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      push({ title: "Invite code copied", variant: "success" });
    } catch {
      push({ title: "Could not copy invite code", variant: "error" });
    }
  }

  async function regenerateInviteCode() {
    if (!confirm("Regenerate the invite code? The current code will stop working immediately.")) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await fetch("/api/clinic/regenerate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: clinic.id }),
      });
      const json = (await res.json()) as { invite_code?: string; error?: string };
      if (!res.ok || !json.invite_code) {
        throw new Error(json.error || "Could not regenerate invite code");
      }
      setInviteCode(json.invite_code);
      push({ title: "New invite code generated", variant: "success" });
    } catch (err) {
      push({
        title: "Could not regenerate",
        description: err instanceof Error ? err.message : "Failed",
        variant: "error",
      });
    } finally {
      setRegenerating(false);
    }
  }

  async function saveClinic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clinicForm.name.trim()) {
      push({ title: "Clinic name is required", variant: "error" });
      return;
    }

    setSavingClinic(true);
    try {
      const res = await fetch("/api/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicForm.name.trim(),
          city: clinicForm.city.trim() || null,
          state: clinicForm.state.trim() || null,
          phone: clinicForm.phone.trim() || null,
          email: clinicForm.email.trim() || null,
          address: clinicForm.address.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Save failed");
      push({ title: "Clinic settings saved", variant: "success" });
      router.refresh();
    } catch (err) {
      push({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save",
        variant: "error",
      });
    } finally {
      setSavingClinic(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <header>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-950">
          Admin Dashboard
        </h1>
        <p className="mt-3 text-sm font-medium text-slate-500">
          {clinic.name} - Overview & Management
        </p>
      </header>

      <nav className="flex w-full flex-wrap gap-x-6 gap-y-1 border-b border-slate-200">
        <AdminTabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
          Admin Dashboard
        </AdminTabButton>
        <AdminTabButton active={activeTab === "team"} onClick={() => setActiveTab("team")}>
          Team Management
        </AdminTabButton>
        <AdminTabButton active={activeTab === "clinic"} onClick={() => setActiveTab("clinic")}>
          Clinic Settings
        </AdminTabButton>
        <AdminTabButton active={activeTab === "documents"} onClick={() => setActiveTab("documents")}>
          Document Management
        </AdminTabButton>
        <AdminTabButton active={activeTab === "audit"} onClick={() => setActiveTab("audit")}>
          HIPAA Audit Log
        </AdminTabButton>
      </nav>

      {activeTab === "dashboard" ? (
        <DashboardPane
          clinic={clinic}
          inviteCode={inviteCode}
          regenerating={regenerating}
          onCopyInvite={copyInviteCode}
          onRegenerateInvite={regenerateInviteCode}
          staffCount={teamMembers.length}
          doctorsCount={counts.doctors}
          assistantCount={counts.assistants}
          todayVisits={todayVisits.length}
          activeToday={counts.active}
          completedToday={counts.completed}
          todayAppointments={todayAppointments.length}
          awaitingReview={awaitingVisits.length}
          totalPatients={totalPatients}
          monthlyDrafts={monthlyDrafts}
        />
      ) : null}

      {activeTab === "team" ? (
        <TeamPane roster={teamMembers} onInvite={() => setShowInviteStaff(true)} />
      ) : null}

      {activeTab === "clinic" ? (
        <ClinicPane
          form={clinicForm}
          saving={savingClinic}
          inviteCode={inviteCode}
          regenerating={regenerating}
          onChange={(key, value) => setClinicForm((current) => ({ ...current, [key]: value }))}
          onSubmit={saveClinic}
          onCopyInvite={copyInviteCode}
          onRegenerateInvite={regenerateInviteCode}
        />
      ) : null}

      {activeTab === "documents" ? <DocumentsPane /> : null}
      {activeTab === "audit" ? <AuditPane /> : null}

      {showInviteStaff ? (
        <InviteStaffModal
          onClose={() => setShowInviteStaff(false)}
          onCreated={(member) => {
            setTeamMembers((current) => [...current, member]);
            setShowInviteStaff(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DashboardPane({
  clinic,
  inviteCode,
  regenerating,
  onCopyInvite,
  onRegenerateInvite,
  staffCount,
  doctorsCount,
  assistantCount,
  todayVisits,
  activeToday,
  completedToday,
  todayAppointments,
  awaitingReview,
  totalPatients,
  monthlyDrafts,
}: {
  clinic: Clinic;
  inviteCode: string;
  regenerating: boolean;
  onCopyInvite: () => void;
  onRegenerateInvite: () => void;
  staffCount: number;
  doctorsCount: number;
  assistantCount: number;
  todayVisits: number;
  activeToday: number;
  completedToday: number;
  todayAppointments: number;
  awaitingReview: number;
  totalPatients: number;
  monthlyDrafts: number;
}) {
  return (
    <section className="space-y-6">
      <div className="premium-panel flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">{clinic.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {clinicLocation(clinic)}
            {clinic.established_year ? ` - Est. ${clinic.established_year}` : ""}
          </p>
        </div>
        <InviteCodeControls
          inviteCode={inviteCode}
          regenerating={regenerating}
          onCopyInvite={onCopyInvite}
          onRegenerateInvite={onRegenerateInvite}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard value={staffCount} label="Total Staff" hint={`${doctorsCount} doctors, ${assistantCount} assistants`} tone="slate" />
        <MetricCard value={todayVisits} label="Today's Visits" hint={`${activeToday} active, ${completedToday} completed`} tone="blue" />
        <MetricCard value={todayAppointments} label="Appointments" hint="scheduled today" tone="cyan" />
        <MetricCard value={awaitingReview} label="Review Backlog" hint="waiting for doctor review" tone="amber" />
        <MetricCard value={totalPatients} label="Total EMRs" hint="clinic patient records" tone="green" />
        <MetricCard value={monthlyDrafts} label="Drafts This Month" hint="recording-assisted visits" tone="slate" />
      </div>
    </section>
  );
}

function TeamPane({
  roster,
  onInvite,
}: {
  roster: RosterMember[];
  onInvite: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "doctor" | "medical_assistant">("all");
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState(roster);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const filtered = members.filter((member) => filter === "all" || member.role === filter);
  const pageData = getClientPageItems(filtered, page, ADMIN_TEAM_PAGE_SIZE);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-5">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All Staff</FilterButton>
          <FilterButton active={filter === "doctor"} onClick={() => setFilter("doctor")}>Doctors</FilterButton>
          <FilterButton active={filter === "medical_assistant"} onClick={() => setFilter("medical_assistant")}>Medical Assistants</FilterButton>
        </div>
        <button type="button" onClick={onInvite} className="btn-teal">
          + Invite Staff
        </button>
      </div>

      <div className="premium-panel overflow-hidden">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Specialty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-sm font-semibold text-slate-500">
                  No records yet.
                </td>
              </tr>
            ) : (
              pageData.pageItems.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-5 py-4">
                    <div className="font-extrabold text-slate-950">
                      {staff.role === "doctor" ? `Dr. ${staff.full_name.replace(/^Dr\.\s*/i, "")}` : staff.full_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {staff.id.slice(0, 8)}@clinic.local
                    </div>
                  </td>
                  <td className="px-5 py-4">{roleLabel(staff.role)}</td>
                  <td className="px-5 py-4">{staff.qualification || "-"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setEditingMember(staff)}
                      className="premium-action"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <ClientPagination
          page={pageData.currentPage}
          pageSize={ADMIN_TEAM_PAGE_SIZE}
          totalItems={filtered.length}
          onPageChange={setPage}
          label="staff"
        />
      </div>

      {editingMember ? (
        <EditStaffModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={(updated) => {
            setMembers((current) =>
              current.map((member) =>
                member.id === updated.id ? { ...member, ...updated } : member,
              ),
            );
            setEditingMember(null);
          }}
        />
      ) : null}
    </section>
  );
}

function EditStaffModal({
  member,
  onClose,
  onSaved,
}: {
  member: RosterMember;
  onClose: () => void;
  onSaved: (member: Pick<RosterMember, "id" | "role">) => void;
}) {
  const { push } = useToast();
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        member?: Pick<RosterMember, "id" | "role">;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed (${res.status})`);
      }
      onSaved(json.member || { id: member.id, role });
      push({ title: "Staff updated", variant: "success" });
    } catch (err) {
      push({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update staff member",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Edit Staff</h2>
            <p className="mt-1 text-xs text-slate-500">{member.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close edit staff"
          >
            x
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Name" value={member.full_name} />
            <ReadOnlyField label="Specialty" value={member.qualification || "-"} />
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-extrabold text-slate-500">
                Role
              </span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Doctor["role"])}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#0f9f95] focus:ring-4 focus:ring-[#0f9f95]/10"
              >
                <option value="doctor">Doctor</option>
                <option value="medical_assistant">Medical Assistant</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-teal disabled:opacity-60">
              {busy ? <Spinner /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-xs font-extrabold text-slate-500">{label}</div>
      <div className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}

function InviteStaffModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (member: RosterMember) => void;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "doctor" as Doctor["role"],
    qualification: "",
    registration_number: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function generatePassword() {
    const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 12; i += 1) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    update("password", password);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        member?: RosterMember;
      };

      if (!res.ok || !json.ok || !json.member) {
        throw new Error(json.error || `Failed (${res.status})`);
      }

      push({
        title: "Staff account created",
        description: `${json.member.full_name} can sign in with ${form.email}.`,
        variant: "success",
      });

      window.alert(
        `Staff account created.\n\nEmail: ${form.email}\nTemp password: ${form.password}\n\nShare these credentials with the staff member.`,
      );
      onCreated(json.member);
    } catch (err) {
      push({
        title: "Invite failed",
        description: err instanceof Error ? err.message : "Could not create staff account",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Invite Staff</h2>
            <p className="mt-1 text-xs text-slate-500">
              Create a sign-in account for a clinic team member.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close invite staff"
          >
            x
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField
              label="Full Name"
              value={form.full_name}
              onChange={(value) => update("full_name", value)}
            />
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-slate-500">
                Role
              </span>
              <select
                value={form.role}
                onChange={(event) => update("role", event.target.value as Doctor["role"])}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#0f9f95] focus:ring-4 focus:ring-[#0f9f95]/10"
              >
                <option value="doctor">Doctor</option>
                <option value="medical_assistant">Medical Assistant</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <AdminField
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => update("email", value)}
            />
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-slate-500">
                Temp Password
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  minLength={8}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm font-medium text-slate-950 outline-none transition focus:border-[#0f9f95] focus:ring-4 focus:ring-[#0f9f95]/10"
                />
                <button type="button" onClick={generatePassword} className="btn-secondary shrink-0">
                  Generate
                </button>
              </div>
            </label>
            {form.role !== "medical_assistant" ? (
              <>
                <AdminField
                  label="Qualification"
                  value={form.qualification}
                  onChange={(value) => update("qualification", value)}
                />
                <AdminField
                  label="Registration Number"
                  value={form.registration_number}
                  onChange={(value) => update("registration_number", value)}
                />
              </>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-teal disabled:opacity-60">
              {busy ? <Spinner /> : null}
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClinicPane({
  form,
  saving,
  inviteCode,
  regenerating,
  onChange,
  onSubmit,
  onCopyInvite,
  onRegenerateInvite,
}: {
  form: {
    name: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    address: string;
  };
  saving: boolean;
  inviteCode: string;
  regenerating: boolean;
  onChange: (key: keyof ClinicPaneProps["form"], value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCopyInvite: () => void;
  onRegenerateInvite: () => void;
}) {
  return (
    <section className="space-y-7">
      <form onSubmit={onSubmit} className="premium-panel space-y-5 p-6">
        <h2 className="text-lg font-extrabold text-slate-950">Clinic Information</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <AdminField label="Clinic Name" value={form.name} onChange={(value) => onChange("name", value)} />
          <AdminField label="City" value={form.city} onChange={(value) => onChange("city", value)} />
          <AdminField label="State" value={form.state} onChange={(value) => onChange("state", value)} />
          <AdminField label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
          <AdminField label="Email" type="email" value={form.email} onChange={(value) => onChange("email", value)} />
        </div>
        <AdminField label="Address" value={form.address} onChange={(value) => onChange("address", value)} />
        <button type="submit" disabled={saving} className="btn-teal disabled:opacity-60">
          {saving ? <Spinner /> : null}
          Save Changes
        </button>
      </form>

      <section className="premium-panel space-y-5 p-6">
        <h2 className="text-lg font-extrabold text-slate-950">Security & Invite Code</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <InviteCodeControls
            inviteCode={inviteCode}
            regenerating={regenerating}
            onCopyInvite={onCopyInvite}
            onRegenerateInvite={onRegenerateInvite}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard title="Two-Factor Authentication (2FA)" detail="Extra login security for all accounts" icon="shield" />
          <FeatureCard title="Auto Logout (idle timeout)" detail="Log out users inactive for 15 min" icon="timer" />
          <FeatureCard title="Role-Based Access Control" detail="Enforce permissions per role" icon="key" />
          <FeatureCard title="Emergency User Access" detail="Break-glass emergency override" icon="alert" />
        </div>
      </section>
    </section>
  );
}

type ClinicPaneProps = {
  form: {
    name: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    address: string;
  };
};

function DocumentsPane() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">Document Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload, review, and track clinic documents.
          </p>
        </div>
        <button type="button" className="btn-teal">
          + Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard value={0} label="Total Files" tone="slate" />
        <MetricCard value="0MB" label="Storage Used" tone="slate" />
        <MetricCard value={0} label="Uploaded Today" tone="blue" />
        <MetricCard value={0} label="Pending Review" tone="amber" />
      </div>

      <DataTable
        headers={["Filename", "Patient", "Type", "Size", "Uploaded By", "Date", "Actions"]}
        emptyText="No records yet."
      />
    </section>
  );
}

function AuditPane() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-slate-950">HIPAA Audit Log</h2>
        <p className="mt-1 text-sm text-slate-500">
          Monitor security events and compliance activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard value={0} label="Events Today" tone="slate" />
        <MetricCard value={0} label="Warnings" tone="amber" />
        <MetricCard value={0} label="Critical Events" tone="rose" />
        <MetricCard value="100%" label="HIPAA Compliant" tone="green" />
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-slate-800">
        Real-Time Event Stream <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-700">Live</span>
      </div>
      <DataTable
        headers={["Time", "User", "Action", "Detail", "IP", "Severity"]}
        emptyText="No records yet."
      />
      <div className="flex justify-start">
        <button type="button" className="btn-secondary">
          Export CSV
        </button>
      </div>
    </section>
  );
}

function AdminTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition ${
        active
          ? "border-[#0f9f95] text-[#0f8f86]"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 py-3 text-sm font-semibold transition ${
        active
          ? "border-[#0f9f95] text-[#0f8f86]"
          : "border-transparent text-slate-500 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  value,
  label,
  hint,
  tone = "slate",
}: {
  value: number | string;
  label: string;
  hint?: string;
  tone?: "slate" | "blue" | "cyan" | "green" | "amber" | "rose";
}) {
  return (
    <div className="card flex min-h-[122px] flex-col justify-center p-5">
      <div className={`text-3xl font-extrabold leading-none ${metricTone[tone]}`}>
        {value}
      </div>
      <div className="mt-3 text-sm text-slate-600">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function InviteCodeControls({
  inviteCode,
  regenerating,
  onCopyInvite,
  onRegenerateInvite,
}: {
  inviteCode: string;
  regenerating: boolean;
  onCopyInvite: () => void;
  onRegenerateInvite: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <span className="text-sm text-slate-700">Staff Invite Code</span>
      <code className="rounded bg-white px-2 py-1 font-mono text-sm font-semibold text-slate-950">
        {inviteCode}
      </code>
      <button type="button" onClick={onCopyInvite} className="btn-secondary">
        Copy
      </button>
      <button type="button" onClick={onRegenerateInvite} disabled={regenerating} className="btn-secondary disabled:opacity-60">
        {regenerating ? <Spinner /> : null}
        Regenerate
      </button>
    </div>
  );
}

function AdminField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#0f9f95] focus:ring-4 focus:ring-[#0f9f95]/10"
      />
    </label>
  );
}

function FeatureCard({
  title,
  detail,
  icon,
}: {
  title: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="premium-module-card">
      <div className="mb-4 text-xl">{featureIcon[icon] || "*"}</div>
      <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function DataTable({
  headers,
  emptyText,
}: {
  headers: string[];
  emptyText: string;
}) {
  return (
    <div className="premium-panel overflow-hidden">
      <table className="premium-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={headers.length} className="px-5 py-14 text-center text-sm font-semibold text-slate-500">
              {emptyText}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function roleLabel(role: Doctor["role"]) {
  if (role === "admin") return "Admin";
  if (role === "medical_assistant") return "Med. Asst.";
  return "Doctor";
}

function clinicLocation(clinic: Clinic) {
  const location = [clinic.city, clinic.state].filter(Boolean).join(", ");
  return location || clinic.address || "Clinic profile";
}

const metricTone = {
  slate: "text-slate-950",
  blue: "text-blue-600",
  cyan: "text-cyan-700",
  green: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

const featureIcon: Record<string, string> = {
  shield: "Shield",
  timer: "Timer",
  key: "Key",
  alert: "Alert",
};
