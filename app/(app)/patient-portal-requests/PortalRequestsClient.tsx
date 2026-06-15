// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
// import { useToast } from "@/components/ui/Toast";
// import { formatDateTime } from "@/lib/utils";

// type DoctorRow = {
//   id: string;
//   full_name: string;
//   qualification: string | null;
// };

// type SubmissionRow = {
//   id: string;
//   clinic_id: string | null;
//   full_name: string | null;
//   first_name: string | null;
//   last_name: string | null;
//   phone: string | null;
//   email: string | null;
//   birthdate: string | null;
//   age: number | null;
//   sex: string | null;
//   blood_group: string | null;
//   height_cm: number | null;
//   emergency_contact: string | null;
//   address: string | null;
//   chief_complaint: string | null;
//   known_allergies: string | null;
//   chronic_conditions: string | null;
//   city: string | null;
//   state: string | null;
//   postal_code: string | null;
//   country: string | null;
//   abha_id: string | null;
//   abha_address: string | null;
//   bp_systolic: number | null;
//   bp_diastolic: number | null;
//   pulse: number | null;
//   temperature_f: number | null;
//   spo2: number | null;
//   weight_kg: number | null;
//   status: string;
//   created_at: string;
// };

// export function PortalRequestsClient({
//   submissions,
//   doctors,
// }: {
//   submissions: SubmissionRow[];
//   doctors: DoctorRow[];
// }) {
//   const router = useRouter();
//   const { push } = useToast();
//   const [selectedDoctors, setSelectedDoctors] = useState<Record<string, string>>({});
//   const [drafts, setDrafts] = useState<Record<string, SubmissionRow>>(() =>
//     Object.fromEntries(submissions.map((submission) => [submission.id, submission])),
//   );
//   const [editing, setEditing] = useState<Record<string, boolean>>({});
//   const [busyId, setBusyId] = useState<string | null>(null);
//   const [page, setPage] = useState(1);
//   const pageData = getClientPageItems(submissions, page, 10);

//   async function assign(submissionId: string) {
//     const doctorId = selectedDoctors[submissionId];
//     const draft = drafts[submissionId];
//     if (!doctorId) {
//       push({ title: "Select a doctor", variant: "error" });
//       return;
//     }

//     setBusyId(submissionId);
//     try {
//       const res = await fetch(`/api/patient/intake/${submissionId}/assign`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ doctor_id: doctorId, updates: draft }),
//       });
//       const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
//       if (!res.ok || !json.ok) throw new Error(json.error || "Could not assign doctor");

//       push({ title: "Doctor assigned", variant: "success" });
//       router.refresh();
//     } catch (err: unknown) {
//       push({
//         title: "Assignment failed",
//         description: err instanceof Error ? err.message : "Could not assign doctor",
//         variant: "error",
//       });
//     } finally {
//       setBusyId(null);
//     }
//   }

//   if (submissions.length === 0) {
//     return (
//       <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
//         No online patient submissions are waiting.
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       {pageData.pageItems.map((submission) => {
//         const draft = drafts[submission.id] || submission;
//         const isEditing = Boolean(editing[submission.id]);

//         return (
//         <article key={submission.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//           <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
//             <div className="min-w-0 flex-1 p-5">
//               <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//                 <div className="flex items-center gap-3">
//                   <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#2563eb] text-sm font-extrabold text-white">
//                     {initials(draft.full_name || "Patient")}
//                   </div>
//                   <div>
//                     <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
//                       {draft.full_name || "Unnamed patient"}
//                     </h2>
//                     <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
//                       Submitted {formatDateTime(submission.created_at)}
//                     </p>
//                   </div>
//                 </div>
//                 <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-700">
//                   Awaiting doctor assignment
//                 </span>
//               </div>

//               {isEditing ? (
//                 <EditGrid
//                   draft={draft}
//                   onChange={(key, value) => updateDraft(submission.id, key, value)}
//                 />
//               ) : (
//                 <>
//                   <div className="mt-5 grid gap-4 xl:grid-cols-3">
//                     <DetailPanel title="Contact">
//                       <Detail label="Phone" value={draft.phone} />
//                       <Detail label="Email" value={draft.email} />
//                       <Detail label="Emergency" value={draft.emergency_contact} />
//                     </DetailPanel>
//                     <DetailPanel title="Profile">
//                       <Detail label="Age / Sex" value={[draft.age, draft.sex].filter(Boolean).join(" / ")} />
//                       <Detail label="Blood Group" value={draft.blood_group} />
//                       <Detail label="Height" value={draft.height_cm ? `${draft.height_cm} cm` : null} />
//                     </DetailPanel>
//                     <DetailPanel title="Clinical">
//                       <Detail label="Allergies" value={draft.known_allergies} />
//                       <Detail label="Conditions" value={draft.chronic_conditions} />
//                       <Detail label="Vitals" value={formatVitals(draft)} />
//                     </DetailPanel>
//                   </div>
//                   <div className="mt-4 grid gap-4 lg:grid-cols-2">
//                     <SummaryBox title="Address" value={formatAddress(draft)} />
//                     <SummaryBox title="ABHA" value={draft.abha_id || draft.abha_address || "-"} />
//                     <SummaryBox title="Chief Complaint" value={draft.chief_complaint || "-"} />
//                     <SummaryBox title="Submitted Location" value={[draft.city, draft.state, draft.postal_code, draft.country].filter(Boolean).join(", ") || "-"} />
//                   </div>
//                 </>
//               )}

//               <button
//                 type="button"
//                 onClick={() =>
//                   setEditing((current) => ({
//                     ...current,
//                     [submission.id]: !current[submission.id],
//                   }))
//                 }
//                 className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-teal-200 hover:text-[#0c8a89]"
//               >
//                 {isEditing ? "Done Editing" : "Edit Details"}
//               </button>
//             </div>

//             <div className="w-full shrink-0 border-t border-slate-100 bg-slate-50/70 p-5 lg:w-80 lg:border-l lg:border-t-0">
//               <label className="block">
//                 <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
//                   Assign doctor
//                 </span>
//                 <select
//                   value={selectedDoctors[submission.id] || ""}
//                   onChange={(e) =>
//                     setSelectedDoctors((current) => ({
//                       ...current,
//                       [submission.id]: e.target.value,
//                     }))
//                   }
//                   className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
//                 >
//                   <option value="">Select doctor</option>
//                   {doctors.map((doctor) => (
//                     <option key={doctor.id} value={doctor.id}>
//                       Dr. {doctor.full_name} {doctor.qualification || ""}
//                     </option>
//                   ))}
//                 </select>
//               </label>
//               <button
//                 type="button"
//                 disabled={busyId === submission.id}
//                 onClick={() => assign(submission.id)}
//                 className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#0f8f83] px-4 text-sm font-extrabold text-white transition hover:bg-[#0c7f76] disabled:opacity-70"
//               >
//                 {busyId === submission.id ? "Assigning..." : "Assign Doctor"}
//               </button>
//             </div>
//           </div>
//         </article>
//       );
//       })}
//       <ClientPagination
//         page={pageData.currentPage}
//         pageSize={10}
//         totalItems={submissions.length}
//         onPageChange={setPage}
//         label="submissions"
//       />
//     </div>
//   );

//   function updateDraft<K extends keyof SubmissionRow>(id: string, key: K, value: SubmissionRow[K]) {
//     setDrafts((current) => ({
//       ...current,
//       [id]: {
//         ...(current[id] || submissions.find((submission) => submission.id === id)!),
//         [key]: value,
//       },
//     }));
//   }
// }

// function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
//   return (
//     <div className="rounded-xl bg-white px-3 py-2">
//       <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
//       <div className="mt-1 text-sm font-bold text-slate-900">{value || "-"}</div>
//     </div>
//   );
// }

// function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
//       <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
//       <div className="space-y-2">{children}</div>
//     </section>
//   );
// }

// function SummaryBox({ title, value }: { title: string; value: string }) {
//   return (
//     <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
//       <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{title}</div>
//       <div className="mt-2 text-sm font-bold leading-6 text-slate-900">{value}</div>
//     </div>
//   );
// }

// function formatAddress(submission: SubmissionRow) {
//   return [submission.address, submission.city, submission.state, submission.postal_code, submission.country]
//     .filter(Boolean)
//     .join(", ") || "-";
// }

// function initials(value: string) {
//   return value
//     .split(" ")
//     .filter(Boolean)
//     .slice(0, 2)
//     .map((part) => part[0]?.toUpperCase())
//     .join("") || "P";
// }

// function formatVitals(submission: SubmissionRow) {
//   const vitals = [
//     submission.bp_systolic && submission.bp_diastolic
//       ? `BP ${submission.bp_systolic}/${submission.bp_diastolic}`
//       : null,
//     submission.pulse ? `Pulse ${submission.pulse}` : null,
//     submission.temperature_f ? `Temp ${submission.temperature_f}F` : null,
//     submission.spo2 ? `SpO2 ${submission.spo2}%` : null,
//     submission.weight_kg ? `Weight ${submission.weight_kg}kg` : null,
//   ].filter(Boolean);

//   return vitals.join(", ");
// }

// function EditGrid({
//   draft,
//   onChange,
// }: {
//   draft: SubmissionRow;
//   onChange: <K extends keyof SubmissionRow>(key: K, value: SubmissionRow[K]) => void;
// }) {
//   return (
//     <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
//       <EditField label="Full Name" value={draft.full_name} onChange={(value) => onChange("full_name", value)} />
//       <EditField label="Phone" value={draft.phone} onChange={(value) => onChange("phone", value)} />
//       <EditField label="Email" value={draft.email} onChange={(value) => onChange("email", value)} />
//       <EditField label="Age" value={draft.age} onChange={(value) => onChange("age", numberValue(value))} />
//       <EditField label="Sex" value={draft.sex} onChange={(value) => onChange("sex", value)} />
//       <EditField label="Blood Group" value={draft.blood_group} onChange={(value) => onChange("blood_group", value)} />
//       <EditField label="Height (cm)" value={draft.height_cm} onChange={(value) => onChange("height_cm", numberValue(value))} />
//       <EditField label="Emergency" value={draft.emergency_contact} onChange={(value) => onChange("emergency_contact", value)} />
//       <EditField label="City" value={draft.city} onChange={(value) => onChange("city", value)} />
//       <EditField label="State" value={draft.state} onChange={(value) => onChange("state", value)} />
//       <EditField label="Postal Code" value={draft.postal_code} onChange={(value) => onChange("postal_code", value)} />
//       <EditField label="ABHA ID" value={draft.abha_id} onChange={(value) => onChange("abha_id", value)} />
//       <EditField label="ABHA Address" value={draft.abha_address} onChange={(value) => onChange("abha_address", value)} />
//       <EditField label="Allergies" value={draft.known_allergies} onChange={(value) => onChange("known_allergies", value)} />
//       <EditField label="Conditions" value={draft.chronic_conditions} onChange={(value) => onChange("chronic_conditions", value)} />
//       <EditField label="BP Systolic" value={draft.bp_systolic} onChange={(value) => onChange("bp_systolic", numberValue(value))} />
//       <EditField label="BP Diastolic" value={draft.bp_diastolic} onChange={(value) => onChange("bp_diastolic", numberValue(value))} />
//       <EditField label="Pulse" value={draft.pulse} onChange={(value) => onChange("pulse", numberValue(value))} />
//       <EditField label="Temp (F)" value={draft.temperature_f} onChange={(value) => onChange("temperature_f", numberValue(value))} />
//       <EditField label="SpO2" value={draft.spo2} onChange={(value) => onChange("spo2", numberValue(value))} />
//       <EditField label="Weight (kg)" value={draft.weight_kg} onChange={(value) => onChange("weight_kg", numberValue(value))} />
//       <label className="sm:col-span-2 lg:col-span-3">
//         <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Address</span>
//         <textarea
//           value={draft.address || ""}
//           onChange={(e) => onChange("address", e.target.value)}
//           rows={2}
//           className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
//         />
//       </label>
//       <label className="sm:col-span-2 lg:col-span-3">
//         <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Chief Complaint</span>
//         <textarea
//           value={draft.chief_complaint || ""}
//           onChange={(e) => onChange("chief_complaint", e.target.value)}
//           rows={2}
//           className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
//         />
//       </label>
//     </div>
//   );
// }

// function EditField({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: string | number | null;
//   onChange: (value: string) => void;
// }) {
//   return (
//     <label>
//       <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
//       <input
//         value={value ?? ""}
//         onChange={(e) => onChange(e.target.value)}
//         className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
//       />
//     </label>
//   );
// }

// function numberValue(value: string) {
//   if (value.trim() === "") return null;
//   const parsed = Number(value);
//   return Number.isFinite(parsed) ? parsed : null;
// }
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { BodyPainDiagram, type PainMarker } from "@/components/patient/BodyPainDiagram";
import { isoLocalDate } from "@/lib/utils";
 
type DoctorRow = {
  id: string;
  full_name: string;
  qualification: string | null;
};
 
type HistoryRow = {
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
  pain_markers: PainMarker[] | null;
  pain_intensity: number | null;
  pain_type: string | null;
  pain_summary: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  assigned_doctor_id: string | null;
  created_patient_id: string | null;
  visit_id: string | null;
  visit_status: string | null;
  visit_date: string | null;
  visit_completed_at: string | null;
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
  pain_markers: PainMarker[] | null;
  pain_intensity: number | null;
  pain_type: string | null;
  pain_summary: string | null;
  status: string;
  created_at: string;
};
 
export function PortalRequestsClient({
  submissions,
  doctors,
  historySubmissions,
}: {
  submissions: SubmissionRow[];
  doctors: DoctorRow[];
  historySubmissions: HistoryRow[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [queue, setQueue] = useState<SubmissionRow[]>(submissions);
  const [selectedId, setSelectedId] = useState<string | null>(submissions[0]?.id ?? null);
  const [selectedDoctors, setSelectedDoctors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, SubmissionRow>>(() =>
    Object.fromEntries(submissions.map((s) => [s.id, s])),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<SubmissionRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmingReject, setConfirmingReject] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<HistoryRow | null>(null);
  const [historyDate, setHistoryDate] = useState(() => isoLocalDate());
 
  const selected = queue.find((s) => s.id === selectedId) ?? null;
  const selectedDraft = selected ? (drafts[selected.id] ?? selected) : null;
  const editingDraft = editingId ? (drafts[editingId] ?? queue.find((submission) => submission.id === editingId) ?? null) : null;
  const delayedCount = queue.filter((submission) => waitingTime(submission.created_at).status === "delayed").length;
  const assignedTodayCount = historySubmissions.filter((row) => isToday(row.reviewed_at)).length;
  const oldestWaiting = queue[0] ? waitingTime(queue[0].created_at).shortLabel : "-";
  const filteredHistorySubmissions = historyDate
    ? historySubmissions.filter((row) => dateInputValue(row.reviewed_at || row.created_at) === historyDate)
    : historySubmissions;

  useEffect(() => {
    if (activeTab !== "pending") return;
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.some((submission) => submission.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [activeTab, queue, selectedId]);
 
  function selectPatient(id: string) {
    setSelectedId(id);
    setConfirming(null);
  }
 
  async function assign(submissionId: string) {
    const doctorId = selectedDoctors[submissionId];
    const draft = drafts[submissionId];
    if (!doctorId) {
      push({ title: "Select a doctor first", variant: "error" });
      return;
    }
 
    setBusyId(submissionId);
    try {
      const res = await fetch(`/api/patient/intake/${submissionId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, updates: draft }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; visitId?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not assign doctor");
 
      if (json.visitId) {
        void fetch("/api/pre-visit-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId: json.visitId }),
        });
      }

      const doctorName = doctors.find((d) => d.id === doctorId)?.full_name ?? "doctor";
      push({ title: `Assigned to Dr. ${doctorName}`, variant: "success" });
      router.refresh();
 
      setQueue((current) => {
        const idx = current.findIndex((s) => s.id === submissionId);
        const next = current.filter((s) => s.id !== submissionId);
        const nextSelected = next[idx] ?? next[idx - 1] ?? null;
        setSelectedId(nextSelected?.id ?? null);
        return next;
      });
      setConfirming(null);
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

  async function reject(submissionId: string) {
    setBusyId(submissionId);
    try {
      const res = await fetch(`/api/patient/intake/${submissionId}/reject`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not reject submission");

      push({ title: "Submission rejected", variant: "success" });
      router.refresh();

      setQueue((current) => {
        const idx = current.findIndex((s) => s.id === submissionId);
        const next = current.filter((s) => s.id !== submissionId);
        const nextSelected = next[idx] ?? next[idx - 1] ?? null;
        setSelectedId(nextSelected?.id ?? null);
        return next;
      });
      setConfirmingReject(null);
    } catch (err: unknown) {
      push({
        title: "Reject failed",
        description: err instanceof Error ? err.message : "Could not reject submission",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  function updateDraft<K extends keyof SubmissionRow>(id: string, key: K, value: SubmissionRow[K]) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? submissions.find((s) => s.id === id)!),
        [key]: value,
      },
    }));
  }

  function openEditor(submission: SubmissionRow) {
    setEditSnapshot(drafts[submission.id] ?? submission);
    setEditingId(submission.id);
  }

  function cancelEditor() {
    if (editingId && editSnapshot) {
      setDrafts((current) => ({
        ...current,
        [editingId]: editSnapshot,
      }));
    }
    setEditingId(null);
    setEditSnapshot(null);
  }

  function closeEditor() {
    setEditingId(null);
    setEditSnapshot(null);
  }
 
  // ── Tab switcher ─────────────────────────────────────────────────────────
  const tabBar = (
    <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
      <button
        type="button"
        onClick={() => setActiveTab("pending")}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold transition ${
          activeTab === "pending"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Pending
        {queue.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-700">
            {queue.length}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("history")}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold transition ${
          activeTab === "history"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        History
        {historySubmissions.length > 0 && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-extrabold text-slate-600">
            {historySubmissions.length}
          </span>
        )}
      </button>
    </div>
  );
 
  // ── History tab ───────────────────────────────────────────────────────────
  if (activeTab === "history") {
    return (
      <div>
        {tabBar}
        <PortalSummary
          pending={queue.length}
          delayed={delayedCount}
          assignedToday={assignedTodayCount}
          oldestWaiting={oldestWaiting}
        />
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              History date
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Filter by the date the request was assigned to EMR.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
            />
            <button
              type="button"
              onClick={() => setHistoryDate(isoLocalDate())}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-[#0c8a89]"
            >
              Today
            </button>
            {historyDate ? (
              <button
                type="button"
                onClick={() => setHistoryDate("")}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-500 transition hover:bg-slate-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
        {historySubmissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
            No patients have been assigned through the portal yet.
          </div>
        ) : filteredHistorySubmissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
            No portal history found for {formatDateFromInput(historyDate)}.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Chief Complaint</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5">Assigned</th>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistorySubmissions.map((row) => {
                  const doctor = doctors.find((d) => d.id === row.assigned_doctor_id);
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setHistoryDetail(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setHistoryDetail(row);
                        }
                      }}
                      className="cursor-pointer transition hover:bg-slate-50/60 focus:bg-slate-50/80 focus:outline-none"
                      title="Open portal request details"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#22c7bd] to-[#2563eb] text-xs font-extrabold text-white">
                            {initials(row.full_name || "P")}
                          </div>
                          <span className="font-bold text-slate-900">{row.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="max-w-[220px] px-5 py-3.5">
                        <p className="truncate text-slate-600">{row.chief_complaint || "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {row.reviewed_at ? formatDate(row.reviewed_at) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {doctor ? (
                          <span className="font-semibold text-slate-700">Dr. {doctor.full_name}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <HistoryStatusBadge row={row} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {historyDetail ? (
          <HistoryDetailModal
            row={historyDetail}
            doctor={doctors.find((d) => d.id === historyDetail.assigned_doctor_id) ?? null}
            onClose={() => setHistoryDetail(null)}
          />
        ) : null}
      </div>
    );
  }
 
  // ── Pending tab ───────────────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div>
        {tabBar}
        <PortalSummary
          pending={0}
          delayed={0}
          assignedToday={assignedTodayCount}
          oldestWaiting="-"
        />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            ✓
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-emerald-800">All caught up!</h3>
          <p className="mt-1 text-sm font-medium text-emerald-600">
            No pending portal requests — all patients have been assigned to a doctor.
          </p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="flex flex-col gap-4">
      {tabBar}
      <PortalSummary
        pending={queue.length}
        delayed={delayedCount}
        assignedToday={assignedTodayCount}
        oldestWaiting={oldestWaiting}
      />

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ── Queue list ── */}
        <div className="flex min-h-[420px] w-full flex-col border-b border-slate-100 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Request Queue
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700">
                {queue.length} waiting
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Oldest requests are shown first.
            </p>
          </div>

          <div className="flex-1 divide-y divide-slate-50 overflow-y-auto">
            {queue.map((submission) => {
              const wt = waitingTime(submission.created_at);
              const isSelected = submission.id === selectedId;
              const meta = [formatAgeSex(submission), submission.phone].filter(Boolean).join(" · ");
              return (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => selectPatient(submission.id)}
                  className={`w-full flex items-start gap-3 border-l-[3px] px-5 py-4 text-left transition ${
                    isSelected
                      ? "border-[#0ea5a4] bg-teal-50/70"
                      : "border-transparent hover:bg-slate-50/80"
                  }`}
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c7bd] to-[#2563eb] text-[11px] font-extrabold text-white shadow-sm">
                    {initials(submission.full_name || "P")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-950">
                          {submission.full_name || "Unnamed patient"}
                        </div>
                        {meta ? (
                          <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                            {meta}
                          </div>
                        ) : null}
                      </div>
                      <UrgencyBadge status={wt.status} />
                    </div>
                    {submission.chief_complaint && (
                      <div className="mt-2 line-clamp-2 text-[12px] font-medium leading-5 text-slate-600">
                        {submission.chief_complaint}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        wt.status === "delayed" ? "bg-rose-500" : wt.status === "waiting" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span suppressHydrationWarning className={`text-[11px] font-bold ${
                        wt.status === "delayed" ? "text-rose-600" : wt.status === "waiting" ? "text-amber-600" : "text-slate-500"
                      }`}>
                        {wt.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detail panel ── */}
        {selected && selectedDraft ? (
          <div className="flex min-w-0 flex-col">

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => undefined}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Back to list"
                >
                  ←
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c7bd] to-[#2563eb] text-sm font-extrabold text-white shadow-sm">
                  {initials(selectedDraft.full_name || "P")}
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-950">
                    {selectedDraft.full_name || "Unnamed patient"}
                  </h2>
                  {(() => {
                    const wt = waitingTime(selected.created_at);
                    return (
                      <p suppressHydrationWarning className={`text-[12px] font-semibold ${wt.urgent ? "text-amber-600" : "text-slate-400"}`}>
                        {wt.urgent ? "⏱ " : ""}{wt.label}
                      </p>
                    );
                  })()}
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Submitted {formatDateTime(selected.created_at)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEditor(selectedDraft)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-[#0c8a89]"
              >
                ✎ Correct Info
              </button>
            </div>

            {/* 3-column content — fills remaining height, no scroll */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="grid h-full grid-cols-1 overflow-y-auto lg:grid-cols-3 lg:divide-x lg:divide-slate-100">

                {/* ── Col 1: Chief Complaint + Contact ── */}
                <div className="flex flex-col gap-0 overflow-y-auto p-5">
                  <ColLabel>Chief Complaint</ColLabel>
                  <p className="mt-1 mb-4 text-[13px] font-semibold leading-snug text-slate-900">
                    {selectedDraft.chief_complaint || <span className="text-slate-400">Not specified</span>}
                  </p>

                  <div className="my-1 h-px bg-slate-100" />
                  <div className="mt-3">
                    <ColLabel>Contact</ColLabel>
                    <div className="mt-2 space-y-2">
                      <ColField label="Phone" value={selectedDraft.phone} />
                      <ColField label="Email" value={selectedDraft.email} />
                      <ColField label="Emergency" value={selectedDraft.emergency_contact} />
                    </div>
                  </div>
                </div>

                {/* ── Col 2: Profile + Clinical ── */}
                <div className="flex flex-col gap-0 overflow-y-auto p-5">
                  <ColLabel>Profile</ColLabel>
                  <div className="mt-2 space-y-2">
                    <ColField
                      label="Age / Sex"
                      value={[selectedDraft.age, selectedDraft.sex].filter(Boolean).join(" / ")}
                    />
                    <ColField label="Blood Group" value={selectedDraft.blood_group} />
                    <ColField
                      label="Height"
                      value={selectedDraft.height_cm ? `${selectedDraft.height_cm} cm` : null}
                    />
                  </div>

                  <div className="my-3 h-px bg-slate-100" />

                  <ColLabel>Clinical</ColLabel>
                  <div className="mt-2 space-y-2">
                    <ColField label="Allergies" value={selectedDraft.known_allergies} />
                    <ColField label="Conditions" value={selectedDraft.chronic_conditions} />
                  </div>

                  <div className="mt-3">
                    <ColLabel>Vitals</ColLabel>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        selectedDraft.bp_systolic && selectedDraft.bp_diastolic
                          ? { label: "BP", value: `${selectedDraft.bp_systolic}/${selectedDraft.bp_diastolic}` } : null,
                        selectedDraft.pulse ? { label: "Pulse", value: `${selectedDraft.pulse}` } : null,
                        selectedDraft.temperature_f ? { label: "Temp", value: `${selectedDraft.temperature_f}°F` } : null,
                        selectedDraft.spo2 ? { label: "SpO2", value: `${selectedDraft.spo2}%` } : null,
                        selectedDraft.weight_kg ? { label: "Wt", value: `${selectedDraft.weight_kg} kg` } : null,
                      ].filter(Boolean).map((chip) => (
                        <span key={chip!.label} className="inline-flex items-baseline gap-1 rounded-lg bg-slate-100 px-2 py-1">
                          <span className="text-[10px] font-bold text-slate-500">{chip!.label}</span>
                          <span className="text-[11px] font-extrabold text-slate-800">{chip!.value}</span>
                        </span>
                      ))}
                      {!selectedDraft.bp_systolic && !selectedDraft.pulse && !selectedDraft.temperature_f && !selectedDraft.spo2 && !selectedDraft.weight_kg && (
                        <span className="text-[12px] text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Col 3: Address + ABHA + Pain ── */}
                <div className="flex flex-col gap-0 overflow-y-auto p-5">
                  <ColLabel>Address</ColLabel>
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-700">
                    {formatAddress(selectedDraft)}
                  </p>

                  {(selectedDraft.abha_id || selectedDraft.abha_address) && (
                    <>
                      <div className="my-3 h-px bg-slate-100" />
                      <ColLabel>ABHA</ColLabel>
                      <p className="mt-1 font-mono text-[12px] font-semibold tracking-wider text-slate-700">
                        {selectedDraft.abha_id || selectedDraft.abha_address}
                      </p>
                    </>
                  )}

                  {selectedDraft.pain_markers && selectedDraft.pain_markers.length > 0 && (
                    <>
                      <div className="my-3 h-px bg-slate-100" />
                      <div className="flex items-center gap-2">
                        <ColLabel>Pain Map</ColLabel>
                        {selectedDraft.pain_intensity != null && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            selectedDraft.pain_intensity <= 3 ? "bg-amber-100 text-amber-700"
                              : selectedDraft.pain_intensity <= 6 ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {selectedDraft.pain_intensity}/10
                          </span>
                        )}
                        {selectedDraft.pain_type && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                            {selectedDraft.pain_type}
                          </span>
                        )}
                      </div>
                      {selectedDraft.pain_summary && (
                        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-600">
                          {selectedDraft.pain_summary}
                        </p>
                      )}
                      <div className="mt-2 space-y-1">
                        {selectedDraft.pain_markers.map((marker, i) => (
                          <div key={marker.id} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
                            <span
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                              style={{ background: marker.intensity <= 3 ? "#f59e0b" : marker.intensity <= 6 ? "#f97316" : "#ef4444" }}
                            >
                              {i + 1}
                            </span>
                            <span className="font-bold text-slate-800">{marker.location}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-500">{marker.painType}</span>
                            <span className="ml-auto font-extrabold text-slate-600">{marker.intensity}/10</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Edit overlay — scrollable, covers content only */}
              {false && (
                <div className="absolute inset-0 overflow-y-auto bg-white">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
                    <p className="text-sm font-extrabold text-slate-900">Correct Patient Info</p>
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0f8f83] px-3 text-xs font-extrabold text-white transition hover:bg-[#0c7f76]"
                    >
                      ✓ Done
                    </button>
                  </div>
                  <div className="p-6">
                    <EditGrid draft={selectedDraft!} onChange={(key, value) => updateDraft(selected!.id, key, value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Assign panel — always pinned to bottom */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
              {confirmingReject === selected.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-600">
                    Reject{" "}
                    <span className="font-extrabold text-slate-950">{selectedDraft.full_name}</span>
                    {"'s"} submission? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      onClick={() => reject(selected.id)}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl bg-rose-600 text-sm font-extrabold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {busyId === selected.id ? "Rejecting…" : "Confirm Reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReject(null)}
                      className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : confirming === selected.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-600">
                    Assign{" "}
                    <span className="font-extrabold text-slate-950">{selectedDraft.full_name}</span>{" "}
                    to{" "}
                    <span className="font-extrabold text-[#0ea5a4]">
                      Dr. {doctors.find((d) => d.id === selectedDoctors[selected.id])?.full_name}
                    </span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      onClick={() => assign(selected.id)}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#0f8f83] text-sm font-extrabold text-white transition hover:bg-[#0c7f76] disabled:opacity-60"
                    >
                      {busyId === selected.id ? "Assigning…" : "Confirm & Assign"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                      Assign to Doctor
                    </label>
                    <select
                      value={selectedDoctors[selected.id] || ""}
                      onChange={(e) => setSelectedDoctors((c) => ({ ...c, [selected.id]: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0ea5a4] focus:bg-white focus:ring-4 focus:ring-[#0ea5a4]/10"
                    >
                      <option value="">Select doctor…</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.full_name}{d.qualification ? ` — ${d.qualification}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!selectedDoctors[selected.id]}
                      onClick={() => setConfirming(selected.id)}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#0f8f83] text-sm font-extrabold text-white transition hover:bg-[#0c7f76] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Assign →
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirming(null); setConfirmingReject(selected.id); }}
                      className="flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-extrabold text-rose-500 transition hover:bg-rose-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-slate-400 lg:flex">
            <svg viewBox="0 0 24 24" className="h-8 w-8 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span className="text-sm font-semibold">Select a patient from the queue</span>
          </div>
        )}
      </div>
      {editingId && editingDraft ? (
        <CorrectInfoDrawer
          draft={editingDraft}
          onChange={(key, value) => updateDraft(editingId, key, value)}
          onCancel={cancelEditor}
          onDone={closeEditor}
        />
      ) : null}
    </div>
  );
}
 
// ── Vitals as chips ─────────────────────────────────────────────────────────
 
function PortalSummary({
  pending,
  delayed,
  assignedToday,
  oldestWaiting,
}: {
  pending: number;
  delayed: number;
  assignedToday: number;
  oldestWaiting: string;
}) {
  const items = [
    { label: "Pending", value: pending, hint: "awaiting assignment", tone: "text-slate-950" },
    { label: "Delayed >30m", value: delayed, hint: "needs attention", tone: delayed > 0 ? "text-rose-600" : "text-slate-950" },
    { label: "Assigned Today", value: assignedToday, hint: "moved to EMR", tone: "text-emerald-700" },
    { label: "Oldest Waiting", value: oldestWaiting, hint: "first in queue", tone: "text-amber-700" },
  ];

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {item.label}
          </div>
          <div className={`mt-1 text-2xl font-black tracking-tight ${item.tone}`}>
            {item.value}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">{item.hint}</div>
        </div>
      ))}
    </div>
  );
}

function UrgencyBadge({ status }: { status: "new" | "waiting" | "delayed" }) {
  const map = {
    new: "bg-emerald-50 text-emerald-700",
    waiting: "bg-amber-50 text-amber-700",
    delayed: "bg-rose-50 text-rose-700",
  };
  const label = status === "new" ? "New" : status === "waiting" ? "Waiting" : "Delayed";

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${map[status]}`}>
      {label}
    </span>
  );
}

function HistoryStatusBadge({ row }: { row: HistoryRow }) {
  const visitLabel = compactVisitStatusText(row.visit_status);

  if (!row.created_patient_id) {
    return (
      <span className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-3 text-xs font-extrabold text-slate-500">
        Not linked
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 items-center rounded-lg bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700">
      EMR{visitLabel ? ` · ${visitLabel}` : ""}
    </span>
  );
}

function VitalsRow({ submission }: { submission: SubmissionRow }) {
  const chips = [
    submission.bp_systolic && submission.bp_diastolic
      ? { label: "BP", value: `${submission.bp_systolic}/${submission.bp_diastolic}` }
      : null,
    submission.pulse ? { label: "Pulse", value: `${submission.pulse}` } : null,
    submission.temperature_f ? { label: "Temp", value: `${submission.temperature_f}°F` } : null,
    submission.spo2 ? { label: "SpO2", value: `${submission.spo2}%` } : null,
    submission.weight_kg ? { label: "Wt", value: `${submission.weight_kg} kg` } : null,
  ].filter(Boolean) as { label: string; value: string }[];
 
  if (chips.length === 0) {
    return (
      <div className="rounded-xl bg-white px-3 py-2">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Vitals</div>
        <div className="mt-1 text-sm font-bold text-slate-400">—</div>
      </div>
    );
  }
 
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Vitals</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-baseline gap-1 rounded-lg bg-slate-100 px-2 py-0.5"
          >
            <span className="text-[10px] font-bold text-slate-500">{chip.label}</span>
            <span className="text-xs font-extrabold text-slate-900">{chip.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
 
// ── Sub-components ───────────────────────────────────────────────────────────
 
function HistoryDetailModal({
  row,
  doctor,
  onClose,
}: {
  row: HistoryRow;
  doctor: DoctorRow | null;
  onClose: () => void;
}) {
  const visitLabel = visitStatusLabel(row.visit_status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[min(860px,calc(100dvh-32px))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c7bd] to-[#2563eb] text-sm font-extrabold text-white">
              {initials(row.full_name || "P")}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-950">
                {row.full_name || "Unnamed patient"}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Submitted {formatDateTime(row.created_at)}
                {row.reviewed_at ? ` · Assigned ${formatDate(row.reviewed_at)}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close details"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex h-7 items-center rounded-lg bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700">
              {row.created_patient_id ? "Moved to EMR" : "Not linked"}
            </span>
            {visitLabel ? (
              <span className={`inline-flex h-7 items-center rounded-lg px-3 text-xs font-extrabold ${visitLabel.className}`}>
                {visitLabel.label}
              </span>
            ) : null}
            {doctor ? (
              <span className="inline-flex h-7 items-center rounded-lg bg-sky-50 px-3 text-xs font-extrabold text-sky-700">
                Dr. {doctor.full_name}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailPanel title="Contact">
              <Detail label="Phone" value={row.phone} />
              <Detail label="Email" value={row.email} />
              <Detail label="Emergency" value={row.emergency_contact} />
            </DetailPanel>
            <DetailPanel title="Profile">
              <Detail label="Age / Sex" value={[row.age != null ? row.age : null, row.sex].filter(Boolean).join(" / ")} />
              <Detail label="Blood Group" value={row.blood_group} />
              <Detail label="Height" value={row.height_cm ? `${row.height_cm} cm` : null} />
            </DetailPanel>
            <DetailPanel title="Clinical">
              <Detail label="Allergies" value={row.known_allergies} />
              <Detail label="Conditions" value={row.chronic_conditions} />
              <VitalsRow submission={row} />
            </DetailPanel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SummaryBox title="Chief Complaint" value={row.chief_complaint || "—"} />
            <SummaryBox title="Address" value={formatAddress(row)} />
            <SummaryBox title="ABHA" value={row.abha_id || row.abha_address || "—"} mono />
            <SummaryBox
              title="Visit Outcome"
              value={[
                row.visit_status ? visitStatusText(row.visit_status) : "No linked visit found",
                row.visit_completed_at ? `completed ${formatDate(row.visit_completed_at)}` : null,
              ].filter(Boolean).join(" · ")}
            />
          </div>

          {row.pain_markers && row.pain_markers.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Pain Map
                </div>
                {row.pain_type ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                    {row.pain_type}
                  </span>
                ) : null}
                {row.pain_intensity != null ? (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-700">
                    {row.pain_intensity}/10
                  </span>
                ) : null}
              </div>
              {row.pain_summary ? (
                <p className="mb-3 text-sm font-semibold leading-6 text-slate-700">{row.pain_summary}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {row.pain_markers.map((marker, index) => (
                  <span key={marker.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white">
                      {index + 1}
                    </span>
                    {marker.location} ({marker.side}) · {marker.intensity}/10
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#0f8f83] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#0c7f76]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value || "—"}</div>
    </div>
  );
}
 
function DetailPanel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-100 bg-slate-50/70 p-3 ${className ?? ""}`}>
      <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
 
function SummaryBox({
  title,
  value,
  mono,
  className,
}: {
  title: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 ${className ?? ""}`}>
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{title}</div>
      <div
        className={`mt-2 text-sm font-bold leading-6 text-slate-900 ${
          mono ? "font-mono tracking-wider" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
 
// ── Helpers ──────────────────────────────────────────────────────────────────
 
function visitStatusText(status: string) {
  const normalized = status.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function compactVisitStatusText(status: string | null | undefined) {
  if (!status) return "";
  if (status === "completed") return "Completed";
  if (status === "awaiting_review") return "Review";
  if (status === "in_progress") return "In progress";
  return visitStatusText(status);
}

function visitStatusLabel(status: string | null | undefined) {
  if (!status) return null;
  if (status === "completed") {
    return {
      label: "Visit completed",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Visit cancelled",
      className: "bg-rose-100 text-rose-700",
    };
  }
  return {
    label: `Visit ${visitStatusText(status).toLowerCase()}`,
    className: "bg-sky-50 text-sky-700",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFromInput(value: string) {
  if (!value) return "the selected date";
  return formatDate(`${value}T00:00:00`);
}
 
function waitingTime(createdAt: string): {
  label: string;
  shortLabel: string;
  urgent: boolean;
  status: "new" | "waiting" | "delayed";
} {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return { label: "Just now", shortLabel: "0m", urgent: false, status: "new" };
  if (minutes < 10) return { label: `Waiting ${minutes}m`, shortLabel: `${minutes}m`, urgent: false, status: "new" };
  if (minutes < 30) return { label: `Waiting ${minutes}m`, shortLabel: `${minutes}m`, urgent: false, status: "waiting" };
  if (minutes < 60) return { label: `Waiting ${minutes}m`, shortLabel: `${minutes}m`, urgent: true, status: "delayed" };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    label: `Waiting ${h}h${m > 0 ? ` ${m}m` : ""}`,
    shortLabel: `${h}h${m > 0 ? ` ${m}m` : ""}`,
    urgent: true,
    status: "delayed",
  };
}

function isToday(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAgeSex(submission: SubmissionRow) {
  return [submission.age != null ? `${submission.age}y` : null, submission.sex].filter(Boolean).join(" / ");
}
 
function formatAddress(submission: SubmissionRow) {
  return (
    [
      submission.address,
      submission.city,
      submission.state,
      submission.postal_code,
      submission.country,
    ]
      .filter(Boolean)
      .join(", ") || "—"
  );
}
 
function initials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}
 
// ── Edit form ────────────────────────────────────────────────────────────────
 
function CorrectInfoDrawer({
  draft,
  onChange,
  onCancel,
  onDone,
}: {
  draft: SubmissionRow;
  onChange: <K extends keyof SubmissionRow>(key: K, value: SubmissionRow[K]) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-5">
      <div className="flex h-[min(920px,calc(100dvh-24px))] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Correct Patient Info</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Review portal-submitted details before assigning.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close correction drawer"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-5">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
            <EditSection title="Basic Information">
              <EditField label="Full Name" value={draft.full_name} onChange={(v) => onChange("full_name", v)} />
              <EditField label="Birthdate" value={draft.birthdate} onChange={(v) => onChange("birthdate", v)} />
              <EditField label="Age" value={draft.age} onChange={(v) => onChange("age", numberValue(v))} />
              <EditField label="Sex" value={draft.sex} onChange={(v) => onChange("sex", v)} />
              <EditField label="Blood Group" value={draft.blood_group} onChange={(v) => onChange("blood_group", v)} />
              <EditField label="Height (cm)" value={draft.height_cm} onChange={(v) => onChange("height_cm", numberValue(v))} />
            </EditSection>

            <EditSection title="Contact Information">
              <EditField label="Phone" value={draft.phone} onChange={(v) => onChange("phone", v)} />
              <EditField label="Email" value={draft.email} onChange={(v) => onChange("email", v)} />
              <EditField label="Emergency Contact" value={draft.emergency_contact} onChange={(v) => onChange("emergency_contact", v)} />
            </EditSection>

            <EditSection title="Clinical">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                  Chief Complaint
                </span>
                <textarea
                  value={draft.chief_complaint || ""}
                  onChange={(e) => onChange("chief_complaint", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
                />
              </label>
              <EditField label="Allergies" value={draft.known_allergies} onChange={(v) => onChange("known_allergies", v)} />
              <EditField label="Conditions" value={draft.chronic_conditions} onChange={(v) => onChange("chronic_conditions", v)} />
            </EditSection>

            <EditSection title="Vitals">
              <EditField label="BP Systolic" value={draft.bp_systolic} onChange={(v) => onChange("bp_systolic", numberValue(v))} />
              <EditField label="BP Diastolic" value={draft.bp_diastolic} onChange={(v) => onChange("bp_diastolic", numberValue(v))} />
              <EditField label="Pulse" value={draft.pulse} onChange={(v) => onChange("pulse", numberValue(v))} />
              <EditField label="Temp (°F)" value={draft.temperature_f} onChange={(v) => onChange("temperature_f", numberValue(v))} />
              <EditField label="SpO2 (%)" value={draft.spo2} onChange={(v) => onChange("spo2", numberValue(v))} />
              <EditField label="Weight (kg)" value={draft.weight_kg} onChange={(v) => onChange("weight_kg", numberValue(v))} />
              <EditField label="Height (cm)" value={draft.height_cm} onChange={(v) => onChange("height_cm", numberValue(v))} />
            </EditSection>

            <EditSection title="Address / ABHA">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                  Address
                </span>
                <textarea
                  value={draft.address || ""}
                  onChange={(e) => onChange("address", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
                />
              </label>
              <EditField label="City" value={draft.city} onChange={(v) => onChange("city", v)} />
              <EditField label="State" value={draft.state} onChange={(v) => onChange("state", v)} />
              <EditField label="Postal Code" value={draft.postal_code} onChange={(v) => onChange("postal_code", v)} />
              <EditField label="ABHA ID" value={draft.abha_id} onChange={(v) => onChange("abha_id", v)} />
              <EditField label="ABHA Address" value={draft.abha_address} onChange={(v) => onChange("abha_address", v)} />
            </EditSection>
          </div>
        </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDone}
              className="flex h-10 items-center justify-center rounded-xl bg-[#0f8f83] px-5 text-sm font-extrabold text-white transition hover:bg-[#0c7f76]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function EditGrid({
  draft,
  onChange,
}: {
  draft: SubmissionRow;
  onChange: <K extends keyof SubmissionRow>(key: K, value: SubmissionRow[K]) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <EditField label="Full Name" value={draft.full_name} onChange={(v) => onChange("full_name", v)} />
      <EditField label="Phone" value={draft.phone} onChange={(v) => onChange("phone", v)} />
      <EditField label="Email" value={draft.email} onChange={(v) => onChange("email", v)} />
      <EditField label="Age" value={draft.age} onChange={(v) => onChange("age", numberValue(v))} />
      <EditField label="Sex" value={draft.sex} onChange={(v) => onChange("sex", v)} />
      <EditField label="Blood Group" value={draft.blood_group} onChange={(v) => onChange("blood_group", v)} />
      <EditField label="Height (cm)" value={draft.height_cm} onChange={(v) => onChange("height_cm", numberValue(v))} />
      <EditField label="Emergency Contact" value={draft.emergency_contact} onChange={(v) => onChange("emergency_contact", v)} />
      <EditField label="City" value={draft.city} onChange={(v) => onChange("city", v)} />
      <EditField label="State" value={draft.state} onChange={(v) => onChange("state", v)} />
      <EditField label="Postal Code" value={draft.postal_code} onChange={(v) => onChange("postal_code", v)} />
      <EditField label="ABHA ID" value={draft.abha_id} onChange={(v) => onChange("abha_id", v)} />
      <EditField label="ABHA Address" value={draft.abha_address} onChange={(v) => onChange("abha_address", v)} />
      <EditField label="Allergies" value={draft.known_allergies} onChange={(v) => onChange("known_allergies", v)} />
      <EditField label="Conditions" value={draft.chronic_conditions} onChange={(v) => onChange("chronic_conditions", v)} />
      <EditField label="BP Systolic" value={draft.bp_systolic} onChange={(v) => onChange("bp_systolic", numberValue(v))} />
      <EditField label="BP Diastolic" value={draft.bp_diastolic} onChange={(v) => onChange("bp_diastolic", numberValue(v))} />
      <EditField label="Pulse" value={draft.pulse} onChange={(v) => onChange("pulse", numberValue(v))} />
      <EditField label="Temp (°F)" value={draft.temperature_f} onChange={(v) => onChange("temperature_f", numberValue(v))} />
      <EditField label="SpO2 (%)" value={draft.spo2} onChange={(v) => onChange("spo2", numberValue(v))} />
      <EditField label="Weight (kg)" value={draft.weight_kg} onChange={(v) => onChange("weight_kg", numberValue(v))} />
      <label className="sm:col-span-2 lg:col-span-3">
        <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
          Address
        </span>
        <textarea
          value={draft.address || ""}
          onChange={(e) => onChange("address", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
        />
      </label>
      <label className="sm:col-span-2 lg:col-span-3">
        <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
          Chief Complaint
        </span>
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
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </label>
  );
}
 
function numberValue(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
      {children}
    </div>
  );
}

function ColField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-slate-800">{value || "—"}</div>
    </div>
  );
}
 
 

