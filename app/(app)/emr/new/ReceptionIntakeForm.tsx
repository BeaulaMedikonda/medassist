// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabaseBrowser } from "@/lib/supabase/browser";
// import { TextInput, TextArea, SelectInput } from "@/components/ui/Field";
// import { Spinner } from "@/components/ui/Spinner";
// import { useToast } from "@/components/ui/Toast";
// import type { Patient } from "@/types/db";

// type DoctorOption = {
//   id: string;
//   full_name: string;
//   qualification: string | null;
// };

// type Assignment = {
//   doctor_id: string;
//   role: "attending" | "resident" | "consultant";
//   appt_time: string; // "" = no appointment, otherwise "HH:MM"
// };

// const TIME_SLOTS: string[] = (() => {
//   const out: string[] = [];
//   for (let h = 9; h <= 18; h++) {
//     out.push(`${String(h).padStart(2, "0")}:00`);
//     out.push(`${String(h).padStart(2, "0")}:30`);
//   }
//   return out;
// })();

// function formatSlotLabel(s: string) {
//   const [hStr, mStr] = s.split(":");
//   let h = parseInt(hStr, 10);
//   const ampm = h >= 12 ? "PM" : "AM";
//   if (h === 0) h = 12;
//   else if (h > 12) h -= 12;
//   return `${h}:${mStr} ${ampm}`;
// }

// export function ReceptionIntakeForm({
//   currentUserId,
//   clinicId,
//   doctors,
// }: {
//   currentUserId: string;
//   clinicId: string;
//   doctors: DoctorOption[];
// }) {
//   const router = useRouter();
//   const { push } = useToast();
//   const [busy, setBusy] = useState(false);

//   // Patient picker
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState<Patient[]>([]);
//   const [searching, setSearching] = useState(false);
//   const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);

//   // New patient fields (used when no pickedPatient)
//   const [patientForm, setPatientForm] = useState({
//     full_name: "",
//     age: "",
//     sex: "",
//     phone: "",
//     email: "",
//     blood_group: "",
//     known_allergies: "",
//     chronic_conditions: "",
//     address: "",
//   });

//   // Vitals
//   const [vitals, setVitals] = useState({
//     bp_systolic: "",
//     bp_diastolic: "",
//     pulse: "",
//     temperature_f: "",
//     spo2: "",
//     weight_kg: "",
//   });

//   // Chief complaint (optional, often captured at front desk)
//   const [chiefComplaint, setChiefComplaint] = useState("");

//   // Doctor assignments
//   const [assignments, setAssignments] = useState<Assignment[]>([]);
//   const [apptDate, setApptDate] = useState<string>(
//     new Date().toISOString().slice(0, 10),
//   );

//   function toggleAssignment(doctorId: string) {
//     setAssignments((cur) => {
//       const found = cur.find((a) => a.doctor_id === doctorId);
//       if (found) return cur.filter((a) => a.doctor_id !== doctorId);
//       return [...cur, { doctor_id: doctorId, role: "attending", appt_time: "" }];
//     });
//   }
//   function setAssignmentRole(doctorId: string, role: Assignment["role"]) {
//     setAssignments((cur) =>
//       cur.map((a) => (a.doctor_id === doctorId ? { ...a, role } : a)),
//     );
//   }
//   function setAssignmentTime(doctorId: string, appt_time: string) {
//     setAssignments((cur) =>
//       cur.map((a) => (a.doctor_id === doctorId ? { ...a, appt_time } : a)),
//     );
//   }

//   // Debounced patient search
//   useEffect(() => {
//     if (pickedPatient) return;
//     if (searchTerm.trim().length < 2) {
//       setSearchResults([]);
//       return;
//     }
//     let cancelled = false;
//     const t = setTimeout(async () => {
//       setSearching(true);
//       try {
//         const supabase = supabaseBrowser();
//         const term = searchTerm.trim();
//         const { data } = await supabase
//           .from("patients")
//           .select("*")
//           .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,emr_number.ilike.%${term}%`)
//           .order("last_visit_at", { ascending: false, nullsFirst: false })
//           .limit(8);
//         if (!cancelled) setSearchResults((data || []) as Patient[]);
//       } finally {
//         if (!cancelled) setSearching(false);
//       }
//     }, 250);
//     return () => {
//       cancelled = true;
//       clearTimeout(t);
//     };
//   }, [searchTerm, pickedPatient]);

//   function clearPicked() {
//     setPickedPatient(null);
//     setSearchTerm("");
//   }

//   async function generateEmrNumber(): Promise<string> {
//     const res = await fetch("/api/emr-number", { method: "POST" });
//     if (!res.ok) {
//       const err = await res.json().catch(() => ({}));
//       throw new Error(err?.error || "Could not generate EMR number");
//     }
//     const j = (await res.json()) as { emr_number: string };
//     return j.emr_number;
//   }

//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     if (assignments.length === 0) {
//       push({
//         title: "Assign at least one doctor",
//         description: "The doctor's queue picks up the visit from this assignment.",
//         variant: "error",
//       });
//       return;
//     }
//     setBusy(true);
//     try {
//       const supabase = supabaseBrowser();

//       // Resolve patient: pick existing or create new
//       let patientId = pickedPatient?.id || null;
//       if (!patientId) {
//         if (!patientForm.full_name.trim()) {
//           throw new Error("Patient full name is required");
//         }
//         const emr_number = await generateEmrNumber();
//         const { data: createdPatient, error: patientErr } = await supabase
//           .from("patients")
//           .insert({
//             doctor_id: assignments[0].doctor_id, // primary attending
//             emr_number,
//             full_name: patientForm.full_name.trim(),
//             age: patientForm.age ? parseInt(patientForm.age, 10) : null,
//             sex:
//               patientForm.sex && ["M", "F", "O"].includes(patientForm.sex)
//                 ? patientForm.sex
//                 : null,
//             phone: patientForm.phone.trim() || null,
//             email: patientForm.email.trim() || null,
//             blood_group: patientForm.blood_group.trim() || null,
//             known_allergies: patientForm.known_allergies.trim() || null,
//             chronic_conditions: patientForm.chronic_conditions.trim() || null,
//             address: patientForm.address.trim() || null,
//           })
//           .select("id")
//           .single();
//         if (patientErr || !createdPatient) {
//           throw new Error(patientErr?.message || "Could not create patient");
//         }
//         patientId = (createdPatient as { id: string }).id;
//       }

//       // Create the visit (clinic_id auto-filled by trigger)
//       const visitInsert = {
//         patient_id: patientId,
//         doctor_id: assignments[0].doctor_id,
//         created_by: currentUserId,
//         visit_date: new Date().toISOString(),
//         status: "queued" as const,
//         bp_systolic: numOrNull(vitals.bp_systolic),
//         bp_diastolic: numOrNull(vitals.bp_diastolic),
//         pulse: numOrNull(vitals.pulse),
//         temperature_f: numOrNull(vitals.temperature_f),
//         spo2: numOrNull(vitals.spo2),
//         weight_kg: numOrNull(vitals.weight_kg),
//         chief_complaints: chiefComplaint.trim() || null,
//       };
//       const { data: visit, error: visitErr } = await supabase
//         .from("visits")
//         .insert(visitInsert)
//         .select("id")
//         .single();
//       if (visitErr || !visit) throw new Error(visitErr?.message || "Could not create visit");
//       const visitId = (visit as { id: string }).id;

//       // Insert visit_doctors rows
//       const { error: assignErr } = await supabase.from("visit_doctors").insert(
//         assignments.map((a) => ({
//           visit_id: visitId,
//           doctor_id: a.doctor_id,
//           role: a.role,
//         })),
//       );
//       if (assignErr) throw new Error(assignErr.message);

//       // Insert appointment rows for any doctor the MA picked a time for.
//       const apptRows = assignments
//         .filter((a) => a.appt_time)
//         .map((a) => {
//           const scheduled = new Date(`${apptDate}T${a.appt_time}:00`);
//           return {
//             clinic_id: clinicId,
//             patient_id: patientId,
//             doctor_id: a.doctor_id,
//             scheduled_at: scheduled.toISOString(),
//             duration_minutes: 15,
//             type: "regular" as const,
//             priority: "normal" as const,
//             status: "scheduled" as const,
//             notes: chiefComplaint.trim() || null,
//             created_by: currentUserId,
//           };
//         });
//       if (apptRows.length > 0) {
//         const { error: apptErr } = await supabase
//           .from("appointments")
//           .insert(apptRows);
//         if (apptErr) throw new Error(apptErr.message);
//       }

//       // Trigger pre-visit summary in the background (best-effort).
//       void fetch("/api/pre-visit-summary", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ visitId }),
//       });

//       const apptCount = apptRows.length;
//       push({
//         title: "EMR ready",
//         description: `Sent to ${assignments.length} doctor${assignments.length === 1 ? "" : "s"}${apptCount ? `, ${apptCount} appointment${apptCount === 1 ? "" : "s"} booked` : ""}.`,
//         variant: "success",
//       });
//       router.replace("/dashboard");
//       router.refresh();
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : "Could not create EMR";
//       push({ title: "Failed", description: msg, variant: "error" });
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <form onSubmit={submit} className="space-y-6">
//       <Section title="1 · Patient">
//         {pickedPatient ? (
//           <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
//             <div className="flex items-start justify-between gap-3">
//               <div>
//                 <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
//                   {pickedPatient.full_name}
//                 </div>
//                 <div className="text-[11px] text-slate-500 dark:text-ink-500">
//                   {pickedPatient.emr_number}
//                   {pickedPatient.age != null
//                     ? ` · ${pickedPatient.age}${pickedPatient.sex || ""}`
//                     : ""}
//                   {pickedPatient.phone ? ` · ${pickedPatient.phone}` : ""}
//                 </div>
//                 {pickedPatient.known_allergies ? (
//                   <p className="mt-1 text-[11px] text-rose-700">
//                     Allergies: {pickedPatient.known_allergies}
//                   </p>
//                 ) : null}
//               </div>
//               <button
//                 type="button"
//                 onClick={clearPicked}
//                 className="text-[11px] font-medium text-brand-700 hover:underline"
//               >
//                 Use different patient
//               </button>
//             </div>
//           </div>
//         ) : (
//           <>
//             <div className="relative">
//               <TextInput
//                 label="Search existing patient"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 placeholder="Name, phone, or EMR number"
//                 hint="Or fill the form below to create a new EMR."
//               />
//               {searchResults.length > 0 ? (
//                 <ul className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900">
//                   {searchResults.map((p) => (
//                     <li key={p.id}>
//                       <button
//                         type="button"
//                         onClick={() => {
//                           setPickedPatient(p);
//                           setSearchResults([]);
//                         }}
//                         className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-ink-800"
//                       >
//                         <span>
//                           <span className="font-medium text-slate-900 dark:text-ink-100">
//                             {p.full_name}
//                           </span>
//                           <span className="ml-2 text-[11px] text-slate-500 dark:text-ink-500">
//                             {p.emr_number}
//                             {p.age != null ? ` · ${p.age}${p.sex || ""}` : ""}
//                           </span>
//                         </span>
//                         {p.phone ? (
//                           <span className="text-[11px] text-slate-400 dark:text-ink-600">
//                             {p.phone}
//                           </span>
//                         ) : null}
//                       </button>
//                     </li>
//                   ))}
//                 </ul>
//               ) : null}
//               {searching ? (
//                 <span className="absolute right-3 top-9 text-[11px] text-slate-400 dark:text-ink-600">
//                   searching…
//                 </span>
//               ) : null}
//             </div>

//             <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
//               <TextInput
//                 label="Full name"
//                 required
//                 value={patientForm.full_name}
//                 onChange={(e) =>
//                   setPatientForm((f) => ({ ...f, full_name: e.target.value }))
//                 }
//                 placeholder="Patient's full name"
//               />
//               <div className="grid grid-cols-2 gap-3">
//                 <TextInput
//                   label="Age"
//                   type="number"
//                   min={0}
//                   max={130}
//                   value={patientForm.age}
//                   onChange={(e) =>
//                     setPatientForm((f) => ({ ...f, age: e.target.value }))
//                   }
//                 />
//                 <SelectInput
//                   label="Sex"
//                   value={patientForm.sex}
//                   onChange={(e) =>
//                     setPatientForm((f) => ({ ...f, sex: e.target.value }))
//                   }
//                 >
//                   <option value="">—</option>
//                   <option value="M">Male</option>
//                   <option value="F">Female</option>
//                   <option value="O">Other</option>
//                 </SelectInput>
//               </div>
//               <TextInput
//                 label="Phone"
//                 value={patientForm.phone}
//                 onChange={(e) =>
//                   setPatientForm((f) => ({ ...f, phone: e.target.value }))
//                 }
//                 placeholder="+91XXXXXXXXXX"
//               />
//               <TextInput
//                 label="Email"
//                 value={patientForm.email}
//                 onChange={(e) =>
//                   setPatientForm((f) => ({ ...f, email: e.target.value }))
//                 }
//               />
//               <TextInput
//                 label="Blood group"
//                 value={patientForm.blood_group}
//                 onChange={(e) =>
//                   setPatientForm((f) => ({ ...f, blood_group: e.target.value }))
//                 }
//               />
//               <TextInput
//                 label="Known allergies"
//                 value={patientForm.known_allergies}
//                 onChange={(e) =>
//                   setPatientForm((f) => ({
//                     ...f,
//                     known_allergies: e.target.value,
//                   }))
//                 }
//               />
//               <TextArea
//                 label="Chronic conditions"
//                 className="sm:col-span-2"
//                 value={patientForm.chronic_conditions}
//                 onChange={(e) =>
//                   setPatientForm((f) => ({
//                     ...f,
//                     chronic_conditions: e.target.value,
//                   }))
//                 }
//                 placeholder="e.g. T2DM, HTN, hypothyroid"
//               />
//             </div>
//           </>
//         )}
//       </Section>

//       <Section title="2 · Vitals (optional)">
//         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
//           <Vital label="BP sys" suffix="mmHg" value={vitals.bp_systolic} onChange={(v) => setVitals((s) => ({ ...s, bp_systolic: v }))} />
//           <Vital label="BP dia" suffix="mmHg" value={vitals.bp_diastolic} onChange={(v) => setVitals((s) => ({ ...s, bp_diastolic: v }))} />
//           <Vital label="Pulse" suffix="bpm" value={vitals.pulse} onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
//           <Vital label="Temp" suffix="°F" value={vitals.temperature_f} onChange={(v) => setVitals((s) => ({ ...s, temperature_f: v }))} />
//           <Vital label="SpO₂" suffix="%" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
//           <Vital label="Weight" suffix="kg" value={vitals.weight_kg} onChange={(v) => setVitals((s) => ({ ...s, weight_kg: v }))} />
//         </div>
//         <TextArea
//           label="Reason for visit / chief complaint (optional)"
//           className="mt-4"
//           value={chiefComplaint}
//           onChange={(e) => setChiefComplaint(e.target.value)}
//           placeholder="What did the patient say at the front desk?"
//         />
//       </Section>

//       <Section title="3 · Assign doctors & schedule">
//         {doctors.length === 0 ? (
//           <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
//             No doctors registered in this clinic yet. Share the invite code from the menu so a doctor can sign up.
//           </p>
//         ) : (
//           <>
//             {assignments.length > 0 ? (
//               <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-ink-800 dark:bg-ink-900/40">
//                 <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
//                   Appointment date
//                 </label>
//                 <input
//                   type="date"
//                   value={apptDate}
//                   onChange={(e) => setApptDate(e.target.value)}
//                   className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
//                   min={new Date().toISOString().slice(0, 10)}
//                 />
//                 <p className="basis-full text-[11px] text-slate-500 dark:text-ink-500">
//                   Pick a time per doctor below to also book an appointment. Leave time blank to just route to their queue.
//                 </p>
//               </div>
//             ) : null}
//             <ul className="space-y-2">
//               {doctors.map((d) => {
//                 const assigned = assignments.find((a) => a.doctor_id === d.id);
//                 return (
//                   <li
//                     key={d.id}
//                     className={`rounded-xl border p-3 transition ${
//                       assigned
//                         ? "border-brand-300 bg-brand-50/40"
//                         : "border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900"
//                     }`}
//                   >
//                     <div className="flex flex-wrap items-center gap-3">
//                       <label className="flex min-w-0 flex-1 items-center gap-3">
//                         <input
//                           type="checkbox"
//                           checked={!!assigned}
//                           onChange={() => toggleAssignment(d.id)}
//                           className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
//                         />
//                         <span className="min-w-0">
//                           <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
//                             Dr. {d.full_name}
//                           </div>
//                           {d.qualification ? (
//                             <div className="text-[11px] text-slate-500 dark:text-ink-500">
//                               {d.qualification}
//                             </div>
//                           ) : null}
//                         </span>
//                       </label>
//                       {assigned ? (
//                         <>
//                           <select
//                             value={assigned.role}
//                             onChange={(e) =>
//                               setAssignmentRole(d.id, e.target.value as Assignment["role"])
//                             }
//                             className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
//                           >
//                             <option value="attending">Attending</option>
//                             <option value="resident">Resident</option>
//                             <option value="consultant">Consultant</option>
//                           </select>
//                           <select
//                             value={assigned.appt_time}
//                             onChange={(e) => setAssignmentTime(d.id, e.target.value)}
//                             className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
//                           >
//                             <option value="">No appointment</option>
//                             {TIME_SLOTS.map((s) => (
//                               <option key={s} value={s}>
//                                 {formatSlotLabel(s)}
//                               </option>
//                             ))}
//                           </select>
//                         </>
//                       ) : null}
//                     </div>
//                   </li>
//                 );
//               })}
//             </ul>
//           </>
//         )}
//       </Section>

//       <div className="flex justify-end">
//         <button type="submit" disabled={busy} className="btn-primary">
//           {busy ? <Spinner /> : null}
//           Save & route to doctor
//         </button>
//       </div>
//     </form>
//   );
// }

// function Section({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <section className="card p-5 sm:p-6">
//       <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
//         {title}
//       </h2>
//       {children}
//     </section>
//   );
// }

// function Vital({
//   label,
//   value,
//   onChange,
//   suffix,
// }: {
//   label: string;
//   value: string;
//   onChange: (v: string) => void;
//   suffix?: string;
// }) {
//   return (
//     <div>
//       <div className="label">{label}</div>
//       <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-ink-900/70">
//         <input
//           inputMode="decimal"
//           value={value}
//           onChange={(e) => onChange(e.target.value)}
//           className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-ink-100 placeholder:font-normal placeholder:text-slate-400 dark:text-ink-600 focus:outline-none"
//           placeholder="—"
//         />
//         {suffix ? (
//           <span className="text-[11px] text-slate-400 dark:text-ink-600">{suffix}</span>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// function numOrNull(s: string): number | null {
//   if (!s.trim()) return null;
//   const n = Number(s);
//   return Number.isFinite(n) ? n : null;
// }



"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TextInput, TextArea, SelectInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

type DoctorOption = {
  id: string;
  full_name: string;
  qualification: string | null;
};

type Assignment = {
  doctor_id: string;
  role: "attending" | "resident" | "consultant";
  appt_time: string; // "" = no appointment, otherwise "HH:MM"
};

const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 18; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export function ReceptionIntakeForm({
  currentUserId,
  clinicId,
  doctors,
  onClose,
}: {
  currentUserId: string;
  clinicId: string;
  doctors: DoctorOption[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    router.push("/emr");
  }, [onClose, router]);

  // Patient fields — maps 1:1 to DB columns
  const [form, setForm] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    birthdate: "",
    age: "",
    sex: "",
    phone: "",
    email: "",
    height_cm: "",
    emergency_contact: "",
    abha_id: "",
    abha_address: "",
    blood_group: "",
    known_allergies: "",
    chronic_conditions: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "IN",
  });

  // Vitals — maps 1:1 to visits DB columns
  const [vitals, setVitals] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    pulse: "",
    temperature_f: "",
    spo2: "",
    weight_kg: "",
  });

  // Chief complaint → visits.chief_complaints
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Doctor assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [apptDate, setApptDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const unassignedDoctors = doctors.filter(
    (d) => !assignments.some((a) => a.doctor_id === d.id),
  );

  function addDoctor(doctorId: string) {
    if (!doctorId) return;
    setAssignments((cur) => [
      ...cur,
      { doctor_id: doctorId, role: "attending", appt_time: "" },
    ]);
  }
  function removeDoctor(doctorId: string) {
    setAssignments((cur) => cur.filter((a) => a.doctor_id !== doctorId));
  }
  function updateAssignment(
    doctorId: string,
    patch: Partial<Pick<Assignment, "role" | "appt_time">>,
  ) {
    setAssignments((cur) =>
      cur.map((a) => (a.doctor_id === doctorId ? { ...a, ...patch } : a)),
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  async function submit(opts: { route: boolean }) {
    const manualFullName = form.full_name.trim();
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const fullName = manualFullName || [firstName, lastName].filter(Boolean).join(" ");

    if (!fullName) {
      push({ title: "Full name is required", variant: "error" });
      return;
    }
    if (opts.route && assignments.length === 0) {
      push({
        title: "Pick at least one doctor",
        description: "Or use 'Save & add to queue' to route later.",
        variant: "error",
      });
      return;
    }
    setBusy(true);
    try {
      const supabase = supabaseBrowser();

      // 1. EMR number
      const emrRes = await fetch("/api/emr-number", { method: "POST" });
      if (!emrRes.ok) {
        const e = await emrRes.json().catch(() => ({}));
        throw new Error(e?.error || "Could not generate EMR number");
      }
      const { emr_number } = (await emrRes.json()) as { emr_number: string };

      // 2. Patient
      const primaryDoctorId = assignments[0]?.doctor_id || currentUserId;
      const ageNum = form.age ? parseInt(form.age, 10) : null;
      const dob = form.birthdate || null;
      const ageDerived =
        ageNum != null
          ? ageNum
          : dob
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(dob).getTime()) /
                    (365.25 * 24 * 3600 * 1000),
                ),
              )
            : null;

      const { data: created, error: pErr } = await supabase
        .from("patients")
        .insert({
          doctor_id: primaryDoctorId,
          clinic_id: clinicId,
          emr_number,
          // Personal
          full_name: fullName,
          first_name: firstName || null,
          last_name: lastName || null,
          birthdate: dob,
          age: ageDerived,
          sex: form.sex && ["M", "F", "O"].includes(form.sex) ? form.sex : null,
          // Contact
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          emergency_contact: form.emergency_contact.trim() || null,
          // Medical
          height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
          blood_group: form.blood_group.trim() || null,
          known_allergies: form.known_allergies.trim() || null,
          chronic_conditions: form.chronic_conditions.trim() || null,
          // ABHA
          abha_id: form.abha_id.trim() || null,
          abha_address: form.abha_address.trim() || null,
          // Address
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          postal_code: form.postal_code.trim() || null,
          country: form.country.trim() || null,
        })
        .select("id")
        .single();
      if (pErr || !created) throw new Error(pErr?.message || "Could not create patient");
      const patientId = (created as { id: string }).id;

      // 3. Visit
      const { data: visit, error: vErr } = await supabase
        .from("visits")
        .insert({
          patient_id: patientId,
          doctor_id: primaryDoctorId,
          created_by: currentUserId,
          visit_date: new Date().toISOString(),
          status: opts.route ? "queued" : "intake",
          bp_systolic: numOrNull(vitals.bp_systolic),
          bp_diastolic: numOrNull(vitals.bp_diastolic),
          pulse: numOrNull(vitals.pulse),
          temperature_f: numOrNull(vitals.temperature_f),
          spo2: numOrNull(vitals.spo2),
          weight_kg: numOrNull(vitals.weight_kg),
          chief_complaints: chiefComplaint.trim() || null,
        })
        .select("id")
        .single();
      if (vErr || !visit) throw new Error(vErr?.message || "Could not create visit");
      const visitId = (visit as { id: string }).id;

      // 4. visit_doctors + appointments (only when routing)
      if (opts.route && assignments.length > 0) {
        const { error: vdErr } = await supabase.from("visit_doctors").insert(
          assignments.map((a) => ({
            visit_id: visitId,
            doctor_id: a.doctor_id,
            role: a.role,
          })),
        );
        if (vdErr) throw new Error(vdErr.message);

        const apptRows = assignments
          .filter((a) => a.appt_time)
          .map((a) => {
            const scheduled = new Date(`${apptDate}T${a.appt_time}:00`);
            return {
              clinic_id: clinicId,
              patient_id: patientId,
              doctor_id: a.doctor_id,
              scheduled_at: scheduled.toISOString(),
              duration_minutes: 15,
              type: "regular" as const,
              priority: "normal" as const,
              status: "scheduled" as const,
              notes: chiefComplaint.trim() || null,
              created_by: currentUserId,
            };
          });
        if (apptRows.length > 0) {
          const { error: apptErr } = await supabase
            .from("appointments")
            .insert(apptRows);
          if (apptErr) throw new Error(apptErr.message);
        }

        // Background pre-visit summary
        void fetch("/api/pre-visit-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId }),
        });
      }

      const apptCount = assignments.filter((a) => a.appt_time).length;
      push({
        title: opts.route ? "Routed to doctor" : "Saved to queue",
        description: opts.route
          ? `${assignments.length} doctor${assignments.length === 1 ? "" : "s"} assigned${apptCount ? `, ${apptCount} appointment${apptCount === 1 ? "" : "s"} booked` : ""}.`
          : "Visit is in pending intake.",
        variant: "success",
      });
      handleClose();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create EMR";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New patient intake" onClose={handleClose} maxWidth="3xl">
      <div className="space-y-5">

        <section>
          <div className="space-y-4">

            {/* Personal */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              Personal
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="First name"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="First name"
              />
              <TextInput
                label="Last name"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Last name"
              />
              <TextInput
                label="Full name"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Full name"
                className="sm:col-span-2"
              />
              <TextInput
                label="Date of birth"
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Age (if DOB unknown)"
                  type="number"
                  min={0}
                  max={130}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                />
                <SelectInput
                  label="Sex"
                  value={form.sex}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </SelectInput>
              </div>
              <TextInput
                label="Height (cm)"
                type="number"
                min={0}
                max={250}
                value={form.height_cm}
                onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                placeholder="e.g. 165"
              />
            </div>

            {/* Contact */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              Contact
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
              />
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="patient@email.com"
              />
              <TextInput
                label="Emergency contact number"
                value={form.emergency_contact}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
              />
            </div>

            {/* Medical */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              Medical
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="Blood group"
                value={form.blood_group}
                onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))}
                placeholder="A+ / B- / O+ ..."
              />
              <TextInput
                label="Known allergies"
                value={form.known_allergies}
                onChange={(e) => setForm((f) => ({ ...f, known_allergies: e.target.value }))}
                placeholder="Penicillin, sulfa, …"
              />
              <TextArea
                label="Chronic conditions"
                className="sm:col-span-2"
                value={form.chronic_conditions}
                onChange={(e) => setForm((f) => ({ ...f, chronic_conditions: e.target.value }))}
                placeholder="T2DM, HTN, hypothyroid"
              />
            </div>

            {/* ABHA */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              ABHA
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="ABHA ID"
                value={form.abha_id}
                onChange={(e) => setForm((f) => ({ ...f, abha_id: e.target.value }))}
                placeholder="XX-XXXX-XXXX-XXXX"
              />
              <TextInput
                label="ABHA address"
                value={form.abha_address}
                onChange={(e) => setForm((f) => ({ ...f, abha_address: e.target.value }))}
                placeholder="name@abdm"
              />
            </div>

            {/* Address */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              Address
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextArea
                label="Address"
                className="sm:col-span-2"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street / locality"
              />
              <TextInput
                label="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <TextInput
                label="State"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
              <TextInput
                label="Postal_code"
                value={form.postal_code}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                placeholder="6-digit PIN"
              />
              <TextInput
                label="Country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="IN"
              />
            </div>

          </div>
        </section>

        {/* ── 2. Vitals ── */}
        <Section title="2 · Vitals (optional)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Vital label="BP sys"      suffix="mmHg" value={vitals.bp_systolic}  onChange={(v) => setVitals((s) => ({ ...s, bp_systolic: v }))} />
            <Vital label="BP dia"      suffix="mmHg" value={vitals.bp_diastolic} onChange={(v) => setVitals((s) => ({ ...s, bp_diastolic: v }))} />
            <Vital label="Pulse"       suffix="bpm"  value={vitals.pulse}        onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
            <Vital label="Temperature" suffix="°F"   value={vitals.temperature_f} onChange={(v) => setVitals((s) => ({ ...s, temperature_f: v }))} />
            <Vital label="SpO₂"        suffix="%"    value={vitals.spo2}         onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
            <Vital label="Weight"      suffix="kg"   value={vitals.weight_kg}    onChange={(v) => setVitals((s) => ({ ...s, weight_kg: v }))} />
          </div>
          <TextArea
            label="Chief complaint"
            className="mt-3"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="What did the patient say at the front desk?"
          />
        </Section>

        {/* ── 3. Assign doctors ── */}
        <Section
          title="3 · Assign doctors"
          subtitle={
            assignments.length === 0
              ? "Pick the doctors who will see this patient. You can assign multiple."
              : `${assignments.length} doctor${assignments.length === 1 ? "" : "s"} assigned. Set an optional appointment time for each.`
          }
        >
          {doctors.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No doctors registered yet. Save as pending intake and route later.
            </p>
          ) : (
            <>
              {assignments.length > 0 ? (
                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-ink-800 dark:bg-ink-900/40 px-3 py-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                    Appointment date
                  </label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="ml-3 inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-ink-500">
                    Pick a time below for each doctor who needs an appointment booked. Leave time blank to just route to their queue.
                  </p>
                </div>
              ) : null}

              <ul className="space-y-2">
                {assignments.map((a) => {
                  const d = doctors.find((x) => x.id === a.doctor_id);
                  if (!d) return null;
                  return (
                    <li
                      key={a.doctor_id}
                      className="rounded-xl border border-brand-300 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-900/20 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                            Dr. {d.full_name}
                          </div>
                          {d.qualification ? (
                            <div className="text-[11px] text-slate-500 dark:text-ink-500">
                              {d.qualification}
                            </div>
                          ) : null}
                        </div>
                        <select
                          value={a.role}
                          onChange={(e) =>
                            updateAssignment(a.doctor_id, {
                              role: e.target.value as Assignment["role"],
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                        >
                          <option value="attending">Attending</option>
                          <option value="resident">Resident</option>
                          <option value="consultant">Consultant</option>
                        </select>
                        <select
                          value={a.appt_time}
                          onChange={(e) =>
                            updateAssignment(a.doctor_id, {
                              appt_time: e.target.value,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                        >
                          <option value="">No appointment</option>
                          {TIME_SLOTS.map((s) => (
                            <option key={s} value={s}>
                              {formatSlotLabel(s)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeDoctor(a.doctor_id)}
                          className="text-[11px] font-medium text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {unassignedDoctors.length > 0 ? (
                <div className="mt-3 flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      addDoctor(e.target.value);
                      e.target.value = "";
                    }}
                    defaultValue=""
                    className="input-base flex-1 py-2 text-sm"
                  >
                    <option value="" disabled>
                      + Add doctor…
                    </option>
                    {unassignedDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.full_name}
                        {d.qualification ? ` · ${d.qualification}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : assignments.length > 0 ? (
                <p className="mt-3 text-[11px] italic text-slate-400 dark:text-ink-600">
                  All clinic doctors are assigned.
                </p>
              ) : null}
            </>
          )}
        </Section>

      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={handleClose} className="btn-ghost" disabled={busy}>
          Cancel
        </button>
        <button
          onClick={() => submit({ route: false })}
          disabled={busy}
          className="btn-secondary"
        >
          {busy ? <Spinner /> : null}
          Save & add to queue
        </button>
        <button
          onClick={() => submit({ route: true })}
          disabled={busy || assignments.length === 0}
          className="btn-primary"
        >
          {busy ? <Spinner /> : null}
          Save & route to {assignments.length || ""} doctor{assignments.length === 1 ? "" : "s"}
        </button>
      </div>
    </Modal>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
        {title}
      </h3>
      {subtitle ? (
        <p className="mb-3 mt-0.5 text-[11px] text-slate-500 dark:text-ink-500">{subtitle}</p>
      ) : (
        <div className="mb-3" />
      )}
      {children}
    </section>
  );
}

function Vital({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-ink-900/70">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-ink-100 placeholder:font-normal placeholder:text-slate-400 dark:text-ink-600 focus:outline-none"
          placeholder="—"
        />
        {suffix ? (
          <span className="text-[11px] text-slate-400 dark:text-ink-600">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

function numOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatSlotLabel(s: string) {
  const [hStr, mStr] = s.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}
