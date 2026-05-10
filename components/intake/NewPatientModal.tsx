"use client";

import { useEffect, useState } from "react";
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

export function NewPatientModal({
  currentUserId,
  clinicId,
  doctors,
  onClose,
}: {
  currentUserId: string;
  clinicId: string;
  doctors: DoctorOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    age: "",
    birthdate: "",
    sex: "",
    phone: "",
    blood_group: "",
    known_allergies: "",
    chronic_conditions: "",
    abha_id: "",
    abha_address: "",
    address_line1: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [vitals, setVitals] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    pulse: "",
    temperature_f: "",
    spo2: "",
    weight_kg: "",
  });
  const [chiefComplaint, setChiefComplaint] = useState("");
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
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(opts: { route: boolean }) {
    if (!form.full_name.trim()) {
      push({ title: "Patient name is required", variant: "error" });
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
      const fullName = form.full_name.trim();
      const tokens = fullName.split(/\s+/).filter(Boolean);
      const givenName = tokens.length > 1 ? tokens.slice(0, -1).join(" ") : null;
      const familyName = tokens.length > 1 ? tokens[tokens.length - 1] : null;
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
          emr_number,
          full_name: fullName,
          given_name: givenName,
          family_name: familyName,
          age: ageDerived,
          birthdate: dob,
          sex: form.sex && ["M", "F", "O"].includes(form.sex) ? form.sex : null,
          phone: form.phone.trim() || null,
          blood_group: form.blood_group.trim() || null,
          known_allergies: form.known_allergies.trim() || null,
          chronic_conditions: form.chronic_conditions.trim() || null,
          abha_id: form.abha_id.trim() || null,
          abha_address: form.abha_address.trim() || null,
          address_line1: form.address_line1.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          postal_code: form.postal_code.trim() || null,
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
      onClose();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create EMR";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New patient intake" onClose={onClose} maxWidth="3xl">
      <div className="space-y-5">
        <Section title="1 · Patient">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Full name"
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Patient's full name"
            />
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Date of birth"
                type="date"
                value={form.birthdate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, birthdate: e.target.value }))
                }
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
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Age (if DOB unknown)"
                type="number"
                min={0}
                max={130}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="ABHA ID"
                value={form.abha_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, abha_id: e.target.value }))
                }
                placeholder="14-digit number"
              />
              <TextInput
                label="ABHA address"
                value={form.abha_address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, abha_address: e.target.value }))
                }
                placeholder="name@abdm"
              />
            </div>
            <TextInput
              label="Blood group"
              value={form.blood_group}
              onChange={(e) =>
                setForm((f) => ({ ...f, blood_group: e.target.value }))
              }
              placeholder="A+ / B- / O+ ..."
            />
            <TextInput
              label="Known allergies"
              value={form.known_allergies}
              onChange={(e) =>
                setForm((f) => ({ ...f, known_allergies: e.target.value }))
              }
              placeholder="Penicillin, sulfa, …"
            />
            <TextArea
              label="Chronic conditions"
              value={form.chronic_conditions}
              onChange={(e) =>
                setForm((f) => ({ ...f, chronic_conditions: e.target.value }))
              }
              placeholder="T2DM, HTN, hypothyroid"
            />
            <TextInput
              label="Address"
              value={form.address_line1}
              onChange={(e) =>
                setForm((f) => ({ ...f, address_line1: e.target.value }))
              }
              placeholder="House / street"
            />
            <div className="grid grid-cols-3 gap-3">
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
                label="PIN"
                value={form.postal_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, postal_code: e.target.value }))
                }
              />
            </div>
          </div>
        </Section>

        <Section title="2 · Vitals (optional)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Vital label="BP sys" suffix="mmHg" value={vitals.bp_systolic} onChange={(v) => setVitals((s) => ({ ...s, bp_systolic: v }))} />
            <Vital label="BP dia" suffix="mmHg" value={vitals.bp_diastolic} onChange={(v) => setVitals((s) => ({ ...s, bp_diastolic: v }))} />
            <Vital label="Pulse" suffix="bpm" value={vitals.pulse} onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
            <Vital label="Temp" suffix="°F" value={vitals.temperature_f} onChange={(v) => setVitals((s) => ({ ...s, temperature_f: v }))} />
            <Vital label="SpO₂" suffix="%" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
            <Vital label="Weight" suffix="kg" value={vitals.weight_kg} onChange={(v) => setVitals((s) => ({ ...s, weight_kg: v }))} />
          </div>
          <TextArea
            label="Chief complaint"
            className="mt-3"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="What did the patient say at the front desk?"
          />
        </Section>

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

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={onClose} className="btn-ghost" disabled={busy}>
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
