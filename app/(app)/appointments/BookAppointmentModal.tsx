"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Modal } from "@/components/ui/Modal";
import { TextArea, SelectInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Doctor, Patient, StaffRole } from "@/types/db";

const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 18; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export function BookAppointmentModal({
  currentUserId,
  clinicId,
  role,
  doctors,
  patients,
  defaultDate,
  onClose,
}: {
  currentUserId: string;
  clinicId: string;
  role: StaffRole;
  doctors: Array<Pick<Doctor, "id" | "full_name" | "qualification">>;
  patients: Patient[];
  defaultDate: string;
  onClose: () => void;
}) {
  const isDoctor = role === "doctor";
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [patientSearch, setPatientSearch] = useState("");
  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(15);
  // Doctors must assign to themselves; the select is locked to their own id.
  const [doctorId, setDoctorId] = useState(
    isDoctor ? currentUserId : doctors[0]?.id || "",
  );
  const [type, setType] = useState<"regular" | "follow_up" | "emergency" | "procedure">("regular");
  const [priority, setPriority] = useState<"normal" | "urgent" | "routine">("normal");
  const [notes, setNotes] = useState("");

  // Patient search (using prefetched patients first; falls back to live search if not present)
  const localResults = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patients.slice(0, 8);
    return patients
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(term) ||
          (p.phone || "").includes(term) ||
          p.emr_number.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [patientSearch, patients]);

  useEffect(() => {
    setSearchResults(localResults);
  }, [localResults]);

  useEffect(() => {
    if (pickedPatient || patientSearch.trim().length < 2) return;
    if (localResults.length > 0) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const sb = supabaseBrowser();
      const term = patientSearch.trim();
      const { data } = await sb
        .from("patients")
        .select("*")
        .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,emr_number.ilike.%${term}%`)
        .order("last_visit_at", { ascending: false, nullsFirst: false })
        .limit(8);
      if (!cancelled) setSearchResults((data || []) as Patient[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [patientSearch, pickedPatient, localResults]);

  async function submit() {
    if (!pickedPatient) {
      push({ title: "Pick a patient", variant: "error" });
      return;
    }
    if (!doctorId) {
      push({ title: "Pick a doctor", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      const scheduled = new Date(`${date}T${time}:00`);
      if (Number.isNaN(scheduled.getTime())) {
        throw new Error("Invalid date/time");
      }
      const sb = supabaseBrowser();
      // Insert with explicit clinic_id (so RLS WITH CHECK passes even if the
      // trigger somehow doesn't fire) and chain .select().single() so any
      // post-insert RLS read failure surfaces instead of silently passing.
      const { data: created, error } = await sb
        .from("appointments")
        .insert({
          clinic_id: clinicId,
          patient_id: pickedPatient.id,
          doctor_id: doctorId,
          scheduled_at: scheduled.toISOString(),
          duration_minutes: duration,
          type,
          priority,
          notes: notes.trim() || null,
          created_by: currentUserId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (!created) throw new Error("Appointment was created but is not visible — check RLS / clinic membership.");

      push({
        title: "Appointment booked",
        description: `${pickedPatient.full_name} on ${date} at ${time}.`,
        variant: "success",
      });
      onClose();
      // Use push (not replace) + refresh so Next invalidates the segment
      // cache even when the URL didn't actually change.
      router.push(`/appointments?date=${date}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Book appointment" onClose={onClose} maxWidth="2xl">
      <div className="space-y-5">
        <div>
          <label className="label">Patient</label>
          {pickedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-900/20 p-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                  {pickedPatient.full_name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-ink-500">
                  {pickedPatient.emr_number}
                  {pickedPatient.phone ? ` · ${pickedPatient.phone}` : ""}
                </div>
              </div>
              <button
                onClick={() => {
                  setPickedPatient(null);
                  setPatientSearch("");
                }}
                className="text-[11px] font-medium text-brand-700 hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by name, phone, or EMR number"
                className="input-base"
              />
              {searchResults.length > 0 ? (
                <ul className="mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-ink-700 dark:bg-ink-900">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPickedPatient(p);
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-ink-800"
                      >
                        <span>
                          <span className="font-medium text-slate-900 dark:text-ink-100">{p.full_name}</span>
                          <span className="ml-2 text-[11px] text-slate-500 dark:text-ink-500">
                            {p.emr_number}
                          </span>
                        </span>
                        {p.phone ? (
                          <span className="text-[11px] text-slate-400 dark:text-ink-600">{p.phone}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="label">Time</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-base"
            >
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {formatSlotLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="input-base"
            >
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>

        {isDoctor ? (
          <div>
            <label className="label">Doctor</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-300">
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400 dark:text-ink-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="9" width="12" height="8" rx="2" />
                <path d="M8 9V7a2 2 0 014 0v2" />
              </svg>
              <span className="font-medium">
                Dr. {doctors.find((d) => d.id === currentUserId)?.full_name || "you"} (assigned to you)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-ink-500">
              Doctors can only book to themselves. Ask reception to route to a colleague.
            </p>
          </div>
        ) : (
          <SelectInput
            label="Doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name}
                {d.qualification ? ` · ${d.qualification}` : ""}
              </option>
            ))}
          </SelectInput>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectInput
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="regular">Regular</option>
            <option value="follow_up">Follow-up</option>
            <option value="emergency">Emergency</option>
            <option value="procedure">Procedure</option>
          </SelectInput>
          <SelectInput
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </SelectInput>
        </div>

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context for the doctor or front desk."
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={onClose} className="btn-ghost" disabled={busy}>
          Cancel
        </button>
        <button onClick={submit} className="btn-primary" disabled={busy || !pickedPatient || !doctorId}>
          {busy ? <Spinner /> : null}
          Confirm booking
        </button>
      </div>
    </Modal>
  );
}

function formatSlotLabel(s: string) {
  const [hStr, mStr] = s.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}
