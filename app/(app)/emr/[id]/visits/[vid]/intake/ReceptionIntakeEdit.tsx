"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Patient, Visit, VisitDoctorAssignment } from "@/types/db";

type DoctorOption = {
  id: string;
  full_name: string;
  qualification: string | null;
};

type Assignment = { doctor_id: string; role: "attending" | "resident" | "consultant" };
const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function ReceptionIntakeEdit({
  patient,
  visit,
  doctors,
  assignments,
}: {
  patient: Patient;
  visit: Visit;
  doctors: DoctorOption[];
  assignments: VisitDoctorAssignment[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const derivedName = splitPatientName(patient);
  const [patientInfo, setPatientInfo] = useState({
    first_name: patient.first_name || derivedName.first_name,
    last_name: patient.last_name || derivedName.last_name,
    birthdate: patient.birthdate || "",
    age: patient.age?.toString() || "",
    sex: patient.sex || "",
    blood_group: patient.blood_group || "",
    height_cm: patient.height_cm?.toString() || "",
    phone: patient.phone || "",
    email: patient.email || "",
    emergency_contact: patient.emergency_contact || "",
    address: patient.address || "",
    city: patient.city || "",
    state: patient.state || "",
    postal_code: patient.postal_code || "",
    country: patient.country || "",
    known_allergies: patient.known_allergies || "",
    chronic_conditions: patient.chronic_conditions || "",
    abha_id: patient.abha_id || "",
    abha_address: patient.abha_address || "",
  });

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

  function updatePatientInfo(key: keyof typeof patientInfo, value: string) {
    setPatientInfo((current) => {
      const next = { ...current, [key]: value };
      if (key === "birthdate") {
        const age = calculateAge(value);
        next.age = age == null ? "" : String(age);
      }
      return next;
    });
  }

  function validatePatientInfo() {
    const fullName = buildFullName(patientInfo.first_name, patientInfo.last_name);
    if (!fullName) return "Patient name is required.";
    if (patientInfo.phone.trim() && !isValidPhone(patientInfo.phone)) {
      return "Enter a valid phone number.";
    }
    if (patientInfo.emergency_contact.trim() && !isValidPhone(patientInfo.emergency_contact)) {
      return "Enter a valid emergency contact number.";
    }
    if (patientInfo.email.trim() && !isValidEmail(patientInfo.email)) {
      return "Enter a valid email address.";
    }
    if (patientInfo.postal_code.trim() && !isValidPostalCode(patientInfo.postal_code)) {
      return "Enter a valid postal code.";
    }
    const age = numOrNull(patientInfo.age);
    if (patientInfo.age.trim() && (age == null || age < 0 || age > 130)) {
      return "Age must be between 0 and 130.";
    }
    const height = numOrNull(patientInfo.height_cm);
    if (patientInfo.height_cm.trim() && (height == null || height < 0 || height > 250)) {
      return "Height must be between 0 and 250 cm.";
    }
    return null;
  }

  async function save() {
    if (current.length === 0) {
      push({ title: "Assign at least one doctor", variant: "error" });
      return;
    }
    const validationError = validatePatientInfo();
    if (validationError) {
      push({ title: "Patient details need attention", description: validationError, variant: "error" });
      return;
    }
    setBusy(true);
    try {
      const fullName = buildFullName(patientInfo.first_name, patientInfo.last_name);

      const patientUpdate: Record<string, unknown> = {
        first_name: nullableText(patientInfo.first_name),
        last_name: nullableText(patientInfo.last_name),
        full_name: fullName,
        birthdate: patientInfo.birthdate || null,
        age: numOrNull(patientInfo.age),
        sex: normalizeSex(patientInfo.sex),
        blood_group: nullableText(patientInfo.blood_group),
        height_cm: numOrNull(patientInfo.height_cm),
        phone: nullableText(patientInfo.phone),
        email: nullableText(patientInfo.email),
        emergency_contact: nullableText(patientInfo.emergency_contact),
        address: nullableText(patientInfo.address),
        city: nullableText(patientInfo.city),
        state: nullableText(patientInfo.state),
        postal_code: nullableText(patientInfo.postal_code),
        country: nullableText(patientInfo.country),
        abha_id: nullableText(patientInfo.abha_id),
        abha_address: nullableText(patientInfo.abha_address),
        known_allergies: nullableText(patientInfo.known_allergies),
        chronic_conditions: nullableText(patientInfo.chronic_conditions),
      };

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

      const res = await fetch(`/api/emr/intake/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          patient: patientUpdate,
          visit: update,
          assignments: current,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Could not save");
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
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
          Patient details
        </h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EditGroup title="Basic Information">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="First name"
                required
                value={patientInfo.first_name}
                onChange={(e) => updatePatientInfo("first_name", e.target.value)}
                placeholder="First name"
              />
              <TextInput
                label="Last name"
                value={patientInfo.last_name}
                onChange={(e) => updatePatientInfo("last_name", e.target.value)}
                placeholder="Last name"
              />
              <TextInput
                label="Birthdate"
                type="date"
                value={patientInfo.birthdate}
                onChange={(e) => updatePatientInfo("birthdate", e.target.value)}
              />
              <TextInput
                label="Age"
                type="number"
                min={0}
                max={130}
                value={patientInfo.age}
                onChange={(e) => updatePatientInfo("age", e.target.value)}
                placeholder="Auto from birthdate"
              />
              <SelectInput
                label="Sex"
                value={patientInfo.sex}
                onChange={(e) => updatePatientInfo("sex", e.target.value)}
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </SelectInput>
              <SelectInput
                label="Blood group"
                value={patientInfo.blood_group}
                onChange={(e) => updatePatientInfo("blood_group", e.target.value)}
              >
                {BLOOD_GROUPS.map((group) => (
                  <option key={group || "empty"} value={group}>
                    {group || "Select"}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="Height (cm)"
                type="number"
                min={0}
                max={250}
                value={patientInfo.height_cm}
                onChange={(e) => updatePatientInfo("height_cm", e.target.value)}
              />
            </div>
          </EditGroup>

          <EditGroup title="Contact Information">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="Phone"
                value={patientInfo.phone}
                onChange={(e) => updatePatientInfo("phone", e.target.value)}
                placeholder="+91XXXXXXXXXX"
              />
              <TextInput
                label="Email"
                type="email"
                value={patientInfo.email}
                onChange={(e) => updatePatientInfo("email", e.target.value)}
                placeholder="patient@example.com"
              />
              <TextInput
                label="Emergency contact"
                className="sm:col-span-2"
                value={patientInfo.emergency_contact}
                onChange={(e) => updatePatientInfo("emergency_contact", e.target.value)}
                placeholder="+91XXXXXXXXXX"
              />
            </div>
          </EditGroup>

          <EditGroup title="Address Details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextArea
                label="Address"
                className="sm:col-span-2"
                value={patientInfo.address}
                onChange={(e) => updatePatientInfo("address", e.target.value)}
                placeholder="House number, street, locality"
              />
              <TextInput label="City" value={patientInfo.city} onChange={(e) => updatePatientInfo("city", e.target.value)} />
              <TextInput label="State" value={patientInfo.state} onChange={(e) => updatePatientInfo("state", e.target.value)} />
              <TextInput label="Postal code" value={patientInfo.postal_code} onChange={(e) => updatePatientInfo("postal_code", e.target.value)} />
              <TextInput label="Country" value={patientInfo.country} onChange={(e) => updatePatientInfo("country", e.target.value)} />
            </div>
          </EditGroup>

          <EditGroup title="Medical and Government Information">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="Known allergies"
                value={patientInfo.known_allergies}
                onChange={(e) => updatePatientInfo("known_allergies", e.target.value)}
                placeholder="Penicillin, sulfa"
              />
              <TextInput
                label="Chronic conditions"
                value={patientInfo.chronic_conditions}
                onChange={(e) => updatePatientInfo("chronic_conditions", e.target.value)}
                placeholder="Hypertension, diabetes"
              />
              <TextInput
                label="ABHA ID"
                value={patientInfo.abha_id}
                onChange={(e) => updatePatientInfo("abha_id", e.target.value)}
                placeholder="XX-XXXX-XXXX-XXXX"
              />
              <TextInput
                label="ABHA address"
                value={patientInfo.abha_address}
                onChange={(e) => updatePatientInfo("abha_address", e.target.value)}
                placeholder="name@abdm"
              />
            </div>
          </EditGroup>
        </div>
      </section>

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

function EditGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/45 p-3.5">
      <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function numOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeSex(value: string) {
  if (value === "M" || value === "F" || value === "O") return value;
  return null;
}

function buildFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function splitPatientName(patient: Patient) {
  if (patient.first_name || patient.last_name) {
    return {
      first_name: patient.first_name || "",
      last_name: patient.last_name || "",
    };
  }
  const parts = (patient.full_name || "").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" "),
  };
}

function calculateAge(value: string) {
  if (!value) return null;
  const birthdate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthdate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDelta = today.getMonth() - birthdate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthdate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function isValidPhone(value: string) {
  return /^[+0-9()\-\s]{7,20}$/.test(value.trim());
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPostalCode(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(value.trim());
}
