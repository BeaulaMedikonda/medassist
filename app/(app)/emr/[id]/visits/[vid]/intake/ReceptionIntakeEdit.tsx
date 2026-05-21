// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabaseBrowser } from "@/lib/supabase/browser";
// import { TextArea } from "@/components/ui/Field";
// import { Spinner } from "@/components/ui/Spinner";
// import { useToast } from "@/components/ui/Toast";
// import type { Patient, Visit, VisitDoctorAssignment } from "@/types/db";

// type DoctorOption = {
//   id: string;
//   full_name: string;
//   qualification: string | null;
// };

// type Assignment = { doctor_id: string; role: "attending" | "resident" | "consultant" };

// export function ReceptionIntakeEdit({
//   patient,
//   visit,
//   doctors,
//   assignments,
// }: {
//   patient: Patient;
//   visit: Visit;
//   doctors: DoctorOption[];
//   assignments: VisitDoctorAssignment[];
// }) {
//   const router = useRouter();
//   const { push } = useToast();
//   const [busy, setBusy] = useState(false);

//   const [vitals, setVitals] = useState({
//     bp_systolic: visit.bp_systolic?.toString() || "",
//     bp_diastolic: visit.bp_diastolic?.toString() || "",
//     pulse: visit.pulse?.toString() || "",
//     temperature_f: visit.temperature_f?.toString() || "",
//     spo2: visit.spo2?.toString() || "",
//     weight_kg: visit.weight_kg?.toString() || "",
//   });
//   const [chiefComplaint, setChiefComplaint] = useState(visit.chief_complaints || "");

//   const [current, setCurrent] = useState<Assignment[]>(
//     assignments.map((a) => ({ doctor_id: a.doctor_id, role: a.role })),
//   );

//   function toggle(doctorId: string) {
//     setCurrent((cur) => {
//       const found = cur.find((a) => a.doctor_id === doctorId);
//       if (found) return cur.filter((a) => a.doctor_id !== doctorId);
//       return [...cur, { doctor_id: doctorId, role: "attending" }];
//     });
//   }
//   function setRole(doctorId: string, role: Assignment["role"]) {
//     setCurrent((cur) => cur.map((a) => (a.doctor_id === doctorId ? { ...a, role } : a)));
//   }

//   async function save() {
//     if (current.length === 0) {
//       push({
//         title: "Assign at least one doctor",
//         variant: "error",
//       });
//       return;
//     }
//     setBusy(true);
//     try {
//       const supabase = supabaseBrowser();

//       const update: Record<string, unknown> = {
//         bp_systolic: numOrNull(vitals.bp_systolic),
//         bp_diastolic: numOrNull(vitals.bp_diastolic),
//         pulse: numOrNull(vitals.pulse),
//         temperature_f: numOrNull(vitals.temperature_f),
//         spo2: numOrNull(vitals.spo2),
//         weight_kg: numOrNull(vitals.weight_kg),
//         chief_complaints: chiefComplaint.trim() || null,
//         // primary attending = first in list (used by the legacy doctor_id column)
//         doctor_id: current[0].doctor_id,
//       };
//       const { error: vErr } = await supabase
//         .from("visits")
//         .update(update)
//         .eq("id", visit.id);
//       if (vErr) throw vErr;

//       // Diff visit_doctors: delete those removed, upsert the rest.
//       const existing = new Set(assignments.map((a) => a.doctor_id));
//       const desired = new Set(current.map((a) => a.doctor_id));

//       const removed = [...existing].filter((id) => !desired.has(id));
//       if (removed.length > 0) {
//         await supabase
//           .from("visit_doctors")
//           .delete()
//           .eq("visit_id", visit.id)
//           .in("doctor_id", removed);
//       }

//       // Upsert current rows
//       for (const a of current) {
//         await supabase.from("visit_doctors").upsert(
//           {
//             visit_id: visit.id,
//             doctor_id: a.doctor_id,
//             role: a.role,
//           },
//           { onConflict: "visit_id,doctor_id" },
//         );
//       }

//       // Re-trigger pre-visit summary since vitals may have changed.
//       void fetch("/api/pre-visit-summary", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ visitId: visit.id, force: true }),
//       });

//       push({ title: "Updated", variant: "success" });
//       router.replace("/dashboard");
//       router.refresh();
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : "Could not save";
//       push({ title: "Save failed", description: msg, variant: "error" });
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <div className="space-y-6">
//       <section className="card p-5 sm:p-6">
//         <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
//           Vitals
//         </h2>
//         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
//           <Vital label="BP sys" suffix="mmHg" value={vitals.bp_systolic} onChange={(v) => setVitals((s) => ({ ...s, bp_systolic: v }))} />
//           <Vital label="BP dia" suffix="mmHg" value={vitals.bp_diastolic} onChange={(v) => setVitals((s) => ({ ...s, bp_diastolic: v }))} />
//           <Vital label="Pulse" suffix="bpm" value={vitals.pulse} onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
//           <Vital label="Temp" suffix="°F" value={vitals.temperature_f} onChange={(v) => setVitals((s) => ({ ...s, temperature_f: v }))} />
//           <Vital label="SpO₂" suffix="%" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
//           <Vital label="Weight" suffix="kg" value={vitals.weight_kg} onChange={(v) => setVitals((s) => ({ ...s, weight_kg: v }))} />
//         </div>
//         <TextArea
//           label="Reason for visit / chief complaint"
//           className="mt-4"
//           value={chiefComplaint}
//           onChange={(e) => setChiefComplaint(e.target.value)}
//         />
//       </section>

//       <section className="card p-5 sm:p-6">
//         <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
//           Doctors on this visit
//         </h2>
//         <ul className="space-y-2">
//           {doctors.map((d) => {
//             const a = current.find((x) => x.doctor_id === d.id);
//             return (
//               <li
//                 key={d.id}
//                 className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
//                   a ? "border-brand-300 bg-brand-50/40" : "border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900"
//                 }`}
//               >
//                 <label className="flex items-center gap-3">
//                   <input
//                     type="checkbox"
//                     checked={!!a}
//                     onChange={() => toggle(d.id)}
//                     className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
//                   />
//                   <span>
//                     <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
//                       Dr. {d.full_name}
//                     </div>
//                     {d.qualification ? (
//                       <div className="text-[11px] text-slate-500 dark:text-ink-500">{d.qualification}</div>
//                     ) : null}
//                   </span>
//                 </label>
//                 {a ? (
//                   <select
//                     value={a.role}
//                     onChange={(e) => setRole(d.id, e.target.value as Assignment["role"])}
//                     className="input-base max-w-[140px] py-1.5 text-xs"
//                   >
//                     <option value="attending">Attending</option>
//                     <option value="resident">Resident</option>
//                     <option value="consultant">Consultant</option>
//                   </select>
//                 ) : null}
//               </li>
//             );
//           })}
//         </ul>
//       </section>

//       <div className="flex justify-end">
//         <button onClick={save} disabled={busy} className="btn-primary">
//           {busy ? <Spinner /> : null}
//           Save updates
//         </button>
//       </div>
//     </div>
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
//         {suffix ? <span className="text-[11px] text-slate-400 dark:text-ink-600">{suffix}</span> : null}
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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TextArea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Patient, PatientAllergy, Visit, VisitDoctorAssignment } from "@/types/db";
import { PatientAllergies } from "@/components/emr/PatientAllergies";

type DoctorOption = {
  id: string;
  full_name: string;
  qualification: string | null;
};

type Assignment = { doctor_id: string; role: "attending" | "resident" | "consultant" };

export function ReceptionIntakeEdit({
  patient,
  visit,
  doctors,
  assignments,
  initialAllergies,
}: {
  patient: Patient;
  visit: Visit;
  doctors: DoctorOption[];
  assignments: VisitDoctorAssignment[];
  initialAllergies: PatientAllergy[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [vitals, setVitals] = useState({
    bp_systolic: visit.bp_systolic?.toString() || "",
    bp_diastolic: visit.bp_diastolic?.toString() || "",
    pulse: visit.pulse?.toString() || "",
    temperature_f: visit.temperature_f?.toString() || "",
    spo2: visit.spo2?.toString() || "",
    weight_kg: visit.weight_kg?.toString() || "",
  });
  const [chiefComplaint, setChiefComplaint] = useState(visit.chief_complaints || "");

  const [current, setCurrent] = useState<Assignment[]>(
    assignments.map((a) => ({ doctor_id: a.doctor_id, role: a.role })),
  );

  function toggle(doctorId: string) {
    setCurrent((cur) => {
      const found = cur.find((a) => a.doctor_id === doctorId);
      if (found) return cur.filter((a) => a.doctor_id !== doctorId);
      return [...cur, { doctor_id: doctorId, role: "attending" }];
    });
  }
  function setRole(doctorId: string, role: Assignment["role"]) {
    setCurrent((cur) => cur.map((a) => (a.doctor_id === doctorId ? { ...a, role } : a)));
  }

  async function save() {
    if (current.length === 0) {
      push({ title: "Assign at least one doctor", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      const supabase = supabaseBrowser();

      // Update vitals / chief complaint
      const update: Record<string, unknown> = {
        bp_systolic: numOrNull(vitals.bp_systolic),
        bp_diastolic: numOrNull(vitals.bp_diastolic),
        pulse: numOrNull(vitals.pulse),
        temperature_f: numOrNull(vitals.temperature_f),
        spo2: numOrNull(vitals.spo2),
        weight_kg: numOrNull(vitals.weight_kg),
        chief_complaints: chiefComplaint.trim() || null,
        doctor_id: current[0].doctor_id,
      };
      const { error: vErr } = await supabase.from("visits").update(update).eq("id", visit.id);
      if (vErr) throw vErr;

      // Diff visit_doctors
      const existing = new Set(assignments.map((a) => a.doctor_id));
      const desired = new Set(current.map((a) => a.doctor_id));
      const removed = [...existing].filter((id) => !desired.has(id));
      if (removed.length > 0) {
        await supabase.from("visit_doctors").delete().eq("visit_id", visit.id).in("doctor_id", removed);
      }
      for (const a of current) {
        await supabase.from("visit_doctors").upsert(
          { visit_id: visit.id, doctor_id: a.doctor_id, role: a.role },
          { onConflict: "visit_id,doctor_id" },
        );
      }

      // Re-trigger pre-visit summary
      void fetch("/api/pre-visit-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: visit.id, force: true }),
      });

      push({ title: "Updated", variant: "success" });
      router.replace("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save";
      push({ title: "Save failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Vitals */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
          Vitals
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Vital label="BP sys" suffix="mmHg" value={vitals.bp_systolic} onChange={(v) => setVitals((s) => ({ ...s, bp_systolic: v }))} />
          <Vital label="BP dia" suffix="mmHg" value={vitals.bp_diastolic} onChange={(v) => setVitals((s) => ({ ...s, bp_diastolic: v }))} />
          <Vital label="Pulse" suffix="bpm" value={vitals.pulse} onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
          <Vital label="Temp" suffix="°F" value={vitals.temperature_f} onChange={(v) => setVitals((s) => ({ ...s, temperature_f: v }))} />
          <Vital label="SpO₂" suffix="%" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
          <Vital label="Weight" suffix="kg" value={vitals.weight_kg} onChange={(v) => setVitals((s) => ({ ...s, weight_kg: v }))} />
        </div>
        <TextArea
          label="Reason for visit / chief complaint"
          className="mt-4"
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
        />
      </section>

      {/* Allergies — full PatientAllergies component (add / edit / delete inline) */}
      <section className="card p-5 sm:p-6">
        <PatientAllergies
          patientId={patient.id}
          initialAllergies={initialAllergies}
        />
      </section>

      {/* Doctors on this visit */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
          Doctors on this visit
        </h2>
        <ul className="space-y-2">
          {doctors.map((d) => {
            const a = current.find((x) => x.doctor_id === d.id);
            return (
              <li
                key={d.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                  a ? "border-brand-300 bg-brand-50/40" : "border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900"
                }`}
              >
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!a}
                    onChange={() => toggle(d.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">Dr. {d.full_name}</div>
                    {d.qualification ? (
                      <div className="text-[11px] text-slate-500 dark:text-ink-500">{d.qualification}</div>
                    ) : null}
                  </span>
                </label>
                {a ? (
                  <select
                    value={a.role}
                    onChange={(e) => setRole(d.id, e.target.value as Assignment["role"])}
                    className="input-base max-w-[140px] py-1.5 text-xs"
                  >
                    <option value="attending">Attending</option>
                    <option value="resident">Resident</option>
                    <option value="consultant">Consultant</option>
                  </select>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Spinner /> : null}
          Save updates
        </button>
      </div>
    </div>
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
        {suffix ? <span className="text-[11px] text-slate-400 dark:text-ink-600">{suffix}</span> : null}
      </div>
    </div>
  );
}

function numOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}



