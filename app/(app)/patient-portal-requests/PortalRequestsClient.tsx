"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

type DoctorRow = {
  id: string;
  full_name: string;
  qualification: string | null;
};

type SubmissionRow = {
  id: string;
  clinic_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  birthdate: string | null;
  age: number | null;
  sex: string | null;
  blood_group: string | null;
  height_cm: number | null;
  emergency_contact: string | null;
  address: string | null;
  chief_complaint: string | null;
  known_allergies: string | null;
  chronic_conditions: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  abha_id: string | null;
  abha_address: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature_f: number | null;
  spo2: number | null;
  weight_kg: number | null;
  status: string;
  created_at: string;
};

export function PortalRequestsClient({
  submissions,
  doctors,
}: {
  submissions: SubmissionRow[];
  doctors: DoctorRow[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [selectedDoctors, setSelectedDoctors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, SubmissionRow>>(() =>
    Object.fromEntries(submissions.map((submission) => [submission.id, submission])),
  );
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageData = getClientPageItems(submissions, page, 10);

  async function assign(submissionId: string) {
    const doctorId = selectedDoctors[submissionId];
    const draft = drafts[submissionId];
    if (!doctorId) {
      push({ title: "Select a doctor", variant: "error" });
      return;
    }

    setBusyId(submissionId);
    try {
      const res = await fetch(`/api/patient/intake/${submissionId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, updates: draft }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not assign doctor");

      push({ title: "Doctor assigned", variant: "success" });
      router.refresh();
    } catch (err: unknown) {
      push({
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Could not assign doctor",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        No online patient submissions are waiting.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pageData.pageItems.map((submission) => {
        const draft = drafts[submission.id] || submission;
        const isEditing = Boolean(editing[submission.id]);

        return (
        <article key={submission.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#2563eb] text-sm font-extrabold text-white">
                    {initials(draft.full_name || "Patient")}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
                      {draft.full_name || "Unnamed patient"}
                    </h2>
                    <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Submitted {formatDateTime(submission.created_at)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-700">
                  Awaiting doctor assignment
                </span>
              </div>

              {isEditing ? (
                <EditGrid
                  draft={draft}
                  onChange={(key, value) => updateDraft(submission.id, key, value)}
                />
              ) : (
                <>
                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    <DetailPanel title="Contact">
                      <Detail label="Phone" value={draft.phone} />
                      <Detail label="Email" value={draft.email} />
                      <Detail label="Emergency" value={draft.emergency_contact} />
                    </DetailPanel>
                    <DetailPanel title="Profile">
                      <Detail label="Age / Sex" value={[draft.age, draft.sex].filter(Boolean).join(" / ")} />
                      <Detail label="Blood Group" value={draft.blood_group} />
                      <Detail label="Height" value={draft.height_cm ? `${draft.height_cm} cm` : null} />
                    </DetailPanel>
                    <DetailPanel title="Clinical">
                      <Detail label="Allergies" value={draft.known_allergies} />
                      <Detail label="Conditions" value={draft.chronic_conditions} />
                      <Detail label="Vitals" value={formatVitals(draft)} />
                    </DetailPanel>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <SummaryBox title="Address" value={formatAddress(draft)} />
                    <SummaryBox title="ABHA" value={draft.abha_id || draft.abha_address || "-"} />
                    <SummaryBox title="Chief Complaint" value={draft.chief_complaint || "-"} />
                    <SummaryBox title="Submitted Location" value={[draft.city, draft.state, draft.postal_code, draft.country].filter(Boolean).join(", ") || "-"} />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  setEditing((current) => ({
                    ...current,
                    [submission.id]: !current[submission.id],
                  }))
                }
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-teal-200 hover:text-[#0c8a89]"
              >
                {isEditing ? "Done Editing" : "Edit Details"}
              </button>
            </div>

            <div className="w-full shrink-0 border-t border-slate-100 bg-slate-50/70 p-5 lg:w-80 lg:border-l lg:border-t-0">
              <label className="block">
                <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                  Assign doctor
                </span>
                <select
                  value={selectedDoctors[submission.id] || ""}
                  onChange={(e) =>
                    setSelectedDoctors((current) => ({
                      ...current,
                      [submission.id]: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name} {doctor.qualification || ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busyId === submission.id}
                onClick={() => assign(submission.id)}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#0f8f83] px-4 text-sm font-extrabold text-white transition hover:bg-[#0c7f76] disabled:opacity-70"
              >
                {busyId === submission.id ? "Assigning..." : "Assign Doctor"}
              </button>
            </div>
          </div>
        </article>
      );
      })}
      <ClientPagination
        page={pageData.currentPage}
        pageSize={10}
        totalItems={submissions.length}
        onPageChange={setPage}
        label="submissions"
      />
    </div>
  );

  function updateDraft<K extends keyof SubmissionRow>(id: string, key: K, value: SubmissionRow[K]) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || submissions.find((submission) => submission.id === id)!),
        [key]: value,
      },
    }));
  }
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value || "-"}</div>
    </div>
  );
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SummaryBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-sm font-bold leading-6 text-slate-900">{value}</div>
    </div>
  );
}

function formatAddress(submission: SubmissionRow) {
  return [submission.address, submission.city, submission.state, submission.postal_code, submission.country]
    .filter(Boolean)
    .join(", ") || "-";
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";
}

function formatVitals(submission: SubmissionRow) {
  const vitals = [
    submission.bp_systolic && submission.bp_diastolic
      ? `BP ${submission.bp_systolic}/${submission.bp_diastolic}`
      : null,
    submission.pulse ? `Pulse ${submission.pulse}` : null,
    submission.temperature_f ? `Temp ${submission.temperature_f}F` : null,
    submission.spo2 ? `SpO2 ${submission.spo2}%` : null,
    submission.weight_kg ? `Weight ${submission.weight_kg}kg` : null,
  ].filter(Boolean);

  return vitals.join(", ");
}

function EditGrid({
  draft,
  onChange,
}: {
  draft: SubmissionRow;
  onChange: <K extends keyof SubmissionRow>(key: K, value: SubmissionRow[K]) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <EditField label="Full Name" value={draft.full_name} onChange={(value) => onChange("full_name", value)} />
      <EditField label="Phone" value={draft.phone} onChange={(value) => onChange("phone", value)} />
      <EditField label="Email" value={draft.email} onChange={(value) => onChange("email", value)} />
      <EditField label="Age" value={draft.age} onChange={(value) => onChange("age", numberValue(value))} />
      <EditField label="Sex" value={draft.sex} onChange={(value) => onChange("sex", value)} />
      <EditField label="Blood Group" value={draft.blood_group} onChange={(value) => onChange("blood_group", value)} />
      <EditField label="Height (cm)" value={draft.height_cm} onChange={(value) => onChange("height_cm", numberValue(value))} />
      <EditField label="Emergency" value={draft.emergency_contact} onChange={(value) => onChange("emergency_contact", value)} />
      <EditField label="City" value={draft.city} onChange={(value) => onChange("city", value)} />
      <EditField label="State" value={draft.state} onChange={(value) => onChange("state", value)} />
      <EditField label="Postal Code" value={draft.postal_code} onChange={(value) => onChange("postal_code", value)} />
      <EditField label="ABHA ID" value={draft.abha_id} onChange={(value) => onChange("abha_id", value)} />
      <EditField label="ABHA Address" value={draft.abha_address} onChange={(value) => onChange("abha_address", value)} />
      <EditField label="Allergies" value={draft.known_allergies} onChange={(value) => onChange("known_allergies", value)} />
      <EditField label="Conditions" value={draft.chronic_conditions} onChange={(value) => onChange("chronic_conditions", value)} />
      <EditField label="BP Systolic" value={draft.bp_systolic} onChange={(value) => onChange("bp_systolic", numberValue(value))} />
      <EditField label="BP Diastolic" value={draft.bp_diastolic} onChange={(value) => onChange("bp_diastolic", numberValue(value))} />
      <EditField label="Pulse" value={draft.pulse} onChange={(value) => onChange("pulse", numberValue(value))} />
      <EditField label="Temp (F)" value={draft.temperature_f} onChange={(value) => onChange("temperature_f", numberValue(value))} />
      <EditField label="SpO2" value={draft.spo2} onChange={(value) => onChange("spo2", numberValue(value))} />
      <EditField label="Weight (kg)" value={draft.weight_kg} onChange={(value) => onChange("weight_kg", numberValue(value))} />
      <label className="sm:col-span-2 lg:col-span-3">
        <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Address</span>
        <textarea
          value={draft.address || ""}
          onChange={(e) => onChange("address", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
        />
      </label>
      <label className="sm:col-span-2 lg:col-span-3">
        <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Chief Complaint</span>
        <textarea
          value={draft.chief_complaint || ""}
          onChange={(e) => onChange("chief_complaint", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
        />
      </label>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </label>
  );
}

function numberValue(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
