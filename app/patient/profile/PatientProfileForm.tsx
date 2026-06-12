"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { Patient } from "@/types/db";
import { BodyPainDiagram, type PainMarker } from "@/components/patient/BodyPainDiagram";
 
type ProfileForm = {
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
 
const PAIN_TYPES = ["Sharp", "Dull", "Burning", "Aching", "Throbbing", "Stabbing", "Cramping"];

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
 
export function PatientProfileForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => ({
    first_name: patient.first_name || "",
    last_name: patient.last_name || "",
    full_name: patient.full_name || "",
    birthdate: patient.birthdate || "",
    age: patient.age ? String(patient.age) : "",
    sex: displaySex(patient.sex || ""),
    blood_group: patient.blood_group || "",
    height_cm: patient.height_cm ? String(patient.height_cm) : "",
    phone: (patient.phone || "").replace(/\D/g, "").slice(-10),
    email: patient.email || "",
    emergency_contact: patient.emergency_contact || "",
    address: patient.address || "",
    city: patient.city || "",
    state: patient.state || "",
    postal_code: patient.postal_code || "",
    country: patient.country || "India",
    known_allergies: patient.known_allergies || "",
    chronic_conditions: patient.chronic_conditions || "",
    chief_complaint: "",
    abha_id: patient.abha_id || "",
    abha_address: patient.abha_address || "",
    bp_systolic: "",
    bp_diastolic: "",
    pulse: "",
    temperature_f: "",
    spo2: "",
    weight_kg: "",
  }));
 
  const computedAge = useMemo(() => calculateAge(form.birthdate), [form.birthdate]);
  const [painMarkers, setPainMarkers] = useState<PainMarker[]>([]);
  const [painIntensity, setPainIntensity] = useState(5);
  const [painType, setPainType] = useState("Sharp");

  function update(key: keyof ProfileForm, value: string) {
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
 
  function buildPainSummary(markers: PainMarker[]): string {
    if (markers.length === 0) return "";
    return markers
      .map((m) => `${m.painType} pain (${m.intensity}/10) at ${m.location} (${m.side})`)
      .join(". ") + ".";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const hasPainMap = painMarkers.length > 0;
      const payload = {
        ...form,
        age: form.age || computedAge,
        pain_markers: hasPainMap ? painMarkers : null,
        pain_intensity: hasPainMap ? painIntensity : null,
        pain_type: hasPainMap ? painType : null,
        pain_summary: hasPainMap ? buildPainSummary(painMarkers) : null,
      };
      const res = await fetch("/api/patient/personal-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save details");
 
      push({
        title: "Successfully completed",
        description: "Your details were sent to the medical assistant for doctor assignment.",
        variant: "success",
      });
      setSubmitted(true);
      router.refresh();
    } catch (err: unknown) {
      push({
        title: "Submit failed",
        description: err instanceof Error ? err.message : "Could not submit details",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }
 
  function moveFieldFocus(e: React.KeyboardEvent<HTMLFormElement>) {
    const focusKeys = ["PageDown", "PageUp", "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (!focusKeys.includes(e.key)) return;
 
    const target = e.target as HTMLElement;
    if (!target.matches("[data-patient-field]")) return;
 
    const fields = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("[data-patient-field]"),
    ).filter((field) => !field.hasAttribute("disabled"));
    const currentIndex = fields.indexOf(target);
    if (currentIndex === -1) return;
 
    e.preventDefault();
    const shouldMoveNext = e.key === "PageDown" || e.key === "ArrowRight" || e.key === "ArrowDown";
    const nextIndex =
      shouldMoveNext
        ? Math.min(currentIndex + 1, fields.length - 1)
        : Math.max(currentIndex - 1, 0);
    fields[nextIndex]?.focus();
  }
 
  const initials = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || patient.full_name?.[0]?.toUpperCase() || "P";

  const avatarHeader = (
    <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-[rgba(14,165,164,0.12)] bg-gradient-to-br from-teal-50/80 to-white p-5 sm:flex-row sm:items-center">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-xl font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(14,165,164,0.55)]">
        {initials}
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">Patient portal</p>
        <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
          {patient.full_name || "Personal Details"}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {patient.age != null && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {patient.age} yrs
            </span>
          )}
          {patient.sex && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {patient.sex}
            </span>
          )}
          {patient.blood_group && (
            <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
              {patient.blood_group}
            </span>
          )}
          {patient.abha_id && (
            <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
              ABHA: {patient.abha_id}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="space-y-5">
        {avatarHeader}
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 10l4 4 8-8" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-emerald-800">Successfully submitted</p>
            <p className="mt-0.5 text-[12px] font-semibold text-emerald-700">
              Your details have been sent to the medical assistant for doctor assignment.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-[#0c8a89]"
        >
          Edit Details
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} onKeyDown={moveFieldFocus} className="space-y-5">
      {avatarHeader}
 
      <Section title="Basic Information">
        <Field label="First Name" value={form.first_name} onChange={(value) => update("first_name", value)} placeholder="First name" />
        <Field label="Last Name" value={form.last_name} onChange={(value) => update("last_name", value)} placeholder="Last name" />
        <Field required label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} placeholder="Full name" span />
        <Field label="Birthdate" type="date" value={form.birthdate} onChange={(value) => update("birthdate", value)} />
        <Field label="Age" value={form.age || computedAge} onChange={(value) => update("age", value)} placeholder="Auto from birthdate" />
        <Select label="Sex" value={form.sex} onChange={(value) => update("sex", value)} options={SEX_OPTIONS} />
        <Select label="Blood Group" value={form.blood_group} onChange={(value) => update("blood_group", value)} options={BLOOD_GROUP_OPTIONS} />
        <Field label="Height (cm)" value={form.height_cm} onChange={(value) => update("height_cm", value)} placeholder="e.g. 165" />
      </Section>
 
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Contact Information">
          <Field
            required
            label="Phone"
            value={form.phone}
            onChange={(value) => update("phone", value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            maxLength={10}
          />
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
          <div className="sm:col-span-2 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
            Common Indian portal items such as Aadhaar, PM-JAY/insurance, consent sharing, and billing can be verified by clinic staff. ABHA details entered here are saved with your patient record.
          </div>
        </Section>
      </div>
 
      {/* Pain Map Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Pain Location
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">Optional</span>
        </div>
        <div className="p-5">
        <p className="mb-5 text-[12px] font-semibold text-slate-400">
          Mark where it hurts on the body diagram. This helps the doctor prepare before your visit.
        </p>

        <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <BodyPainDiagram
            markers={painMarkers}
            onAddMarker={(marker) => setPainMarkers((prev) => [...prev, marker])}
            onRemoveMarker={(id) => setPainMarkers((prev) => prev.filter((m) => m.id !== id))}
            intensity={painIntensity}
            painType={painType}
          />

          <div className="space-y-5">
            <div>
              <span className="mb-2 block text-[12px] font-extrabold text-slate-700">Pain Type</span>
              <div className="flex flex-wrap gap-2">
                {PAIN_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPainType(type)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                      painType === type
                        ? "border-[#0ea5a4] bg-teal-50 text-[#0c8a89]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-extrabold text-slate-700">Pain Intensity</span>
                <span className={`rounded-lg px-2 py-0.5 text-sm font-extrabold ${
                  painIntensity <= 3
                    ? "bg-amber-50 text-amber-600"
                    : painIntensity <= 6
                    ? "bg-orange-50 text-orange-600"
                    : "bg-red-50 text-red-600"
                }`}>
                  {painIntensity} / 10
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={painIntensity}
                onChange={(e) => setPainIntensity(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#0ea5a4]"
              />
              <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
                <span>No pain</span>
                <span>Worst pain</span>
              </div>
            </div>

            {painMarkers.length > 0 ? (
              <div>
                <span className="mb-2 block text-[12px] font-extrabold text-slate-700">
                  Marked Points ({painMarkers.length})
                </span>
                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {painMarkers.map((marker, i) => (
                    <div
                      key={marker.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                          style={{
                            background:
                              marker.intensity <= 3 ? "#f59e0b" : marker.intensity <= 6 ? "#f97316" : "#ef4444",
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-800">{marker.location}</span>
                          <span className="ml-1 text-[10px] text-slate-400">({marker.side})</span>
                          <div className="text-[10px] text-slate-500">
                            {marker.painType} · {marker.intensity}/10
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPainMarkers((prev) => prev.filter((m) => m.id !== marker.id))}
                        className="ml-2 text-sm font-bold text-slate-300 transition hover:text-red-400"
                        aria-label="Remove marker"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-400">
                No pain points marked yet. Tap the body diagram to add.
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      <Section title="Vitals Optional">
        <Field label="BP Systolic (mmHg)" value={form.bp_systolic} onChange={(value) => update("bp_systolic", value)} />
        <Field label="BP Diastolic (mmHg)" value={form.bp_diastolic} onChange={(value) => update("bp_diastolic", value)} />
        <Field label="Pulse (bpm)" value={form.pulse} onChange={(value) => update("pulse", value)} />
        <Field label="Temp (F)" value={form.temperature_f} onChange={(value) => update("temperature_f", value)} />
        <Field label="SpO2 (%)" value={form.spo2} onChange={(value) => update("spo2", value)} />
        <Field label="Weight (kg)" value={form.weight_kg} onChange={(value) => update("weight_kg", value)} />
      </Section>
 
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <p className="text-[12px] font-semibold text-slate-400">
          Your details will be reviewed by clinic staff before your appointment.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="ml-4 flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0ea5a4] to-[#0c8a89] px-6 text-sm font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(14,165,164,0.60)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Submitting…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
              Save Details
            </>
          )}
        </button>
      </div>
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
 
function displaySex(value: string) {
  if (value === "F") return "Female";
  if (value === "M") return "Male";
  if (value === "O") return "Others";
  return value;
}
 
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{title}</h2>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div>
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
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  span?: boolean;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-[12px] font-extrabold text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        data-patient-field
        required={required}
        type={type}
        maxLength={maxLength}
        inputMode={inputMode}
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
        data-patient-field
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
        data-patient-field
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
 
 