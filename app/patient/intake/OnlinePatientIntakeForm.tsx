"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/browser";

type IntakeForm = {
  first_name: string;
  last_name: string;
  full_name: string;
  birthdate: string;
  age: string;
  sex: string;
  blood_group: string;
  height_cm: string;
  phone: string;
  email: string;
  emergency_contact: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  known_allergies: string;
  chronic_conditions: string;
  chief_complaint: string;
  abha_id: string;
  abha_address: string;
  bp_systolic: string;
  bp_diastolic: string;
  pulse: string;
  temperature_f: string;
  spo2: string;
  weight_kg: string;
};

const initialForm: IntakeForm = {
  first_name: "",
  last_name: "",
  full_name: "",
  birthdate: "",
  age: "",
  sex: "",
  blood_group: "",
  height_cm: "",
  phone: "+91",
  email: "",
  emergency_contact: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  known_allergies: "",
  chronic_conditions: "",
  chief_complaint: "",
  abha_id: "",
  abha_address: "",
  bp_systolic: "",
  bp_diastolic: "",
  pulse: "",
  temperature_f: "",
  spo2: "",
  weight_kg: "",
};

const SEX_OPTIONS = [
  { value: "", label: "Select" },
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Others", label: "Others" },
];

const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Select blood group" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

export function OnlinePatientIntakeForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<IntakeForm>({ ...initialForm, email: initialEmail });

  const computedAge = useMemo(() => {
    if (!form.birthdate) return "";
    const birth = new Date(form.birthdate);
    if (Number.isNaN(birth.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age >= 0 ? String(age) : "";
  }, [form.birthdate]);

  function update(key: keyof IntakeForm, value: string) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "birthdate") next.age = calculateAge(value);
      if (key === "first_name" || key === "last_name") {
        next.full_name = buildFullName(
          key === "first_name" ? value : current.first_name,
          key === "last_name" ? value : current.last_name,
        );
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const payload = { ...form, age: form.age || computedAge };
      const res = await fetch("/api/patient/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not submit intake");

      push({
        title: "Details submitted",
        description: "Please sign in again to open your patient portal.",
        variant: "success",
      });
      await supabaseBrowser().auth.signOut();
      router.replace("/patient/login");
      router.refresh();
    } catch (err: unknown) {
      push({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Could not submit intake",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Basic Information">
        <Field label="First Name" value={form.first_name} onChange={(value) => update("first_name", value)} placeholder="First name" />
        <Field label="Last Name" value={form.last_name} onChange={(value) => update("last_name", value)} placeholder="Last name" />
        <Field required label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} placeholder="Auto from first and last name" span />
        <Field label="Birthdate" type="date" value={form.birthdate} onChange={(value) => update("birthdate", value)} />
        <Field label="Age" value={form.age || computedAge} onChange={(value) => update("age", value)} placeholder="Auto from birthdate" />
        <Select label="Sex" value={form.sex} onChange={(value) => update("sex", value)} options={SEX_OPTIONS} />
        <Select label="Blood Group" value={form.blood_group} onChange={(value) => update("blood_group", value)} options={BLOOD_GROUP_OPTIONS} />
        <Field label="Height (cm)" value={form.height_cm} onChange={(value) => update("height_cm", value)} placeholder="e.g. 165" />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Contact Information">
          <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} required />
          <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="patient@example.com" />
          <Field label="Emergency Contact" value={form.emergency_contact} onChange={(value) => update("emergency_contact", value)} placeholder="+91XXXXXXXXXX" span />
        </Section>

        <Section title="Address Details">
          <Textarea label="Address" value={form.address} onChange={(value) => update("address", value)} placeholder="House number, street, locality" span />
          <Field label="City" value={form.city} onChange={(value) => update("city", value)} placeholder="Hyderabad" />
          <Field label="State" value={form.state} onChange={(value) => update("state", value)} placeholder="Telangana" />
          <Field label="Postal Code" value={form.postal_code} onChange={(value) => update("postal_code", value)} placeholder="500001" />
          <Field label="Country" value={form.country} onChange={(value) => update("country", value)} />
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Medical Information">
          <Field label="Known Allergies" value={form.known_allergies} onChange={(value) => update("known_allergies", value)} placeholder="e.g. Penicillin, Sulfa" span />
          <Field label="Chronic Conditions" value={form.chronic_conditions} onChange={(value) => update("chronic_conditions", value)} placeholder="e.g. Hypertension, Diabetes" span />
          <Textarea label="Chief Complaint" value={form.chief_complaint} onChange={(value) => update("chief_complaint", value)} placeholder="Describe chief complaint..." span />
        </Section>

        <Section title="Government / ABHA Information">
          <Field label="ABHA ID" value={form.abha_id} onChange={(value) => update("abha_id", value)} placeholder="XX-XXXX-XXXX-XXXX" />
          <Field label="ABHA Address" value={form.abha_address} onChange={(value) => update("abha_address", value)} placeholder="name@abdm" />
        </Section>
      </div>

      <Section title="Vitals Optional">
        <Field label="BP Systolic (mmHg)" value={form.bp_systolic} onChange={(value) => update("bp_systolic", value)} />
        <Field label="BP Diastolic (mmHg)" value={form.bp_diastolic} onChange={(value) => update("bp_diastolic", value)} />
        <Field label="Pulse (bpm)" value={form.pulse} onChange={(value) => update("pulse", value)} />
        <Field label="Temp (F)" value={form.temperature_f} onChange={(value) => update("temperature_f", value)} />
        <Field label="SpO2 (%)" value={form.spo2} onChange={(value) => update("spo2", value)} />
        <Field label="Weight (kg)" value={form.weight_kg} onChange={(value) => update("weight_kg", value)} />
      </Section>

      <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm font-semibold text-slate-600">
        Doctor assignment is handled by the medical assistant after review. Patients cannot select doctors here.
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0f8f83] to-[#2563eb] px-4 text-sm font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
      >
        {busy ? "Submitting..." : "Submit to Medical Assistant"}
      </button>
    </form>
  );
}

function calculateAge(birthdate: string) {
  if (!birthdate) return "";
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
}

function buildFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-[12px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  span = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  span?: boolean;
}) {
  return (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-[12px] font-extrabold text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  span = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  span?: boolean;
}) {
  return (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-[12px] font-extrabold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-extrabold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
