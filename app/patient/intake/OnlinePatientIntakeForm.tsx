"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BodyPainDiagram, type PainMarker } from "@/components/patient/BodyPainDiagram";

type FormErrors = Partial<Record<keyof IntakeForm, string>>;
type FormTouched = Partial<Record<keyof IntakeForm, boolean>>;

function validateForm(form: IntakeForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.full_name.trim()) errors.full_name = "Full name is required";
  if (!form.phone.trim() || form.phone === "+91") {
    errors.phone = "Phone number is required";
  } else if (!/^\+?[0-9\s\-().]{7,16}$/.test(form.phone)) {
    errors.phone = "Enter a valid phone number";
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address";
  }
  if (form.birthdate) {
    const birth = new Date(form.birthdate);
    if (!Number.isNaN(birth.getTime()) && birth > new Date()) {
      errors.birthdate = "Birthdate cannot be in the future";
    }
  }
  const inRange = (v: string, min: number, max: number) =>
    !v || (Number(v) >= min && Number(v) <= max);
  if (!inRange(form.bp_systolic, 50, 300)) errors.bp_systolic = "Valid range: 50–300 mmHg";
  if (!inRange(form.bp_diastolic, 30, 200)) errors.bp_diastolic = "Valid range: 30–200 mmHg";
  if (!inRange(form.pulse, 20, 300)) errors.pulse = "Valid range: 20–300 bpm";
  if (!inRange(form.spo2, 1, 100)) errors.spo2 = "Valid range: 1–100%";
  if (!inRange(form.temperature_f, 90, 115)) errors.temperature_f = "Valid range: 90–115 °F";
  if (!inRange(form.weight_kg, 1, 500)) errors.weight_kg = "Valid range: 1–500 kg";
  return errors;
}

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

export function OnlinePatientIntakeForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<IntakeForm>({ ...initialForm, email: initialEmail });
  const [touched, setTouched] = useState<FormTouched>({});
  const [painMarkers, setPainMarkers] = useState<PainMarker[]>([]);
  const [painIntensity, setPainIntensity] = useState(5);
  const [painType, setPainType] = useState("Sharp");
  const today = todayInputValue();

  const errors = validateForm(form);

  function touch(key: keyof IntakeForm) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function fieldError(key: keyof IntakeForm) {
    return touched[key] ? errors[key] : undefined;
  }

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

  function buildPainSummary(markers: PainMarker[]): string {
    if (markers.length === 0) return "";
    return markers
      .map((m) => `${m.painType} pain (${m.intensity}/10) at ${m.location} (${m.side})`)
      .join(". ") + ".";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      Object.keys(initialForm).map((k) => [k, true]),
    ) as FormTouched;
    setTouched(allTouched);
    if (Object.keys(validateForm(form)).length > 0) return;
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
      router.replace("/login?next=/patient/profile");
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
        <Field label="First Name" value={form.first_name} onChange={(value) => update("first_name", value)} onBlur={() => touch("first_name")} placeholder="First name" />
        <Field label="Last Name" value={form.last_name} onChange={(value) => update("last_name", value)} onBlur={() => touch("last_name")} placeholder="Last name" />
        <Field required label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} onBlur={() => touch("full_name")} placeholder="Auto from first and last name" span error={fieldError("full_name")} />
        <Field label="Birthdate" type="date" value={form.birthdate} max={today} onChange={(value) => update("birthdate", value)} onBlur={() => touch("birthdate")} error={fieldError("birthdate")} />
        <Field label="Age" value={form.age || computedAge} onChange={(value) => update("age", value)} placeholder="Auto from birthdate" />
        <Select label="Gender" value={form.sex} onChange={(value) => update("sex", value)} options={SEX_OPTIONS} />
        <Select label="Blood Group" value={form.blood_group} onChange={(value) => update("blood_group", value)} options={BLOOD_GROUP_OPTIONS} />
        <Field label="Height (cm)" value={form.height_cm} onChange={(value) => update("height_cm", value)} placeholder="e.g. 165" />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Contact Information">
          <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} onBlur={() => touch("phone")} required error={fieldError("phone")} />
          <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} onBlur={() => touch("email")} placeholder="patient@example.com" error={fieldError("email")} />
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

      {/* Pain Map Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
          Pain Location{" "}
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">
            Optional
          </span>
        </h2>
        <p className="mb-5 text-xs font-semibold text-slate-400">
          Mark where it hurts on the body diagram. This helps the doctor prepare before your visit.
        </p>

        <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          {/* Body diagram */}
          <BodyPainDiagram
            markers={painMarkers}
            onAddMarker={(marker) => setPainMarkers((prev) => [...prev, marker])}
            onRemoveMarker={(id) => setPainMarkers((prev) => prev.filter((m) => m.id !== id))}
            intensity={painIntensity}
            painType={painType}
          />

          {/* Controls */}
          <div className="space-y-5">
            {/* Pain type */}
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

            {/* Intensity */}
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

            {/* Marker list */}
            {painMarkers.length > 0 && (
              <div>
                <span className="mb-2 block text-[12px] font-extrabold text-slate-700">
                  Marked Points ({painMarkers.length})
                </span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
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
                              marker.intensity <= 3
                                ? "#f59e0b"
                                : marker.intensity <= 6
                                ? "#f97316"
                                : "#ef4444",
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
                        className="ml-2 text-slate-300 hover:text-red-400 transition text-sm font-bold"
                        aria-label="Remove marker"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {painMarkers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-400">
                No pain points marked yet. Tap the body diagram to add.
              </div>
            )}
          </div>
        </div>
      </section>

      <Section title="Vitals Optional">
        <Field label="BP Systolic (mmHg)" value={form.bp_systolic} onChange={(value) => update("bp_systolic", value)} onBlur={() => touch("bp_systolic")} error={fieldError("bp_systolic")} />
        <Field label="BP Diastolic (mmHg)" value={form.bp_diastolic} onChange={(value) => update("bp_diastolic", value)} onBlur={() => touch("bp_diastolic")} error={fieldError("bp_diastolic")} />
        <Field label="Pulse (bpm)" value={form.pulse} onChange={(value) => update("pulse", value)} onBlur={() => touch("pulse")} error={fieldError("pulse")} />
        <Field label="Temp (F)" value={form.temperature_f} onChange={(value) => update("temperature_f", value)} onBlur={() => touch("temperature_f")} error={fieldError("temperature_f")} />
        <Field label="SpO2 (%)" value={form.spo2} onChange={(value) => update("spo2", value)} onBlur={() => touch("spo2")} error={fieldError("spo2")} />
        <Field label="Weight (kg)" value={form.weight_kg} onChange={(value) => update("weight_kg", value)} onBlur={() => touch("weight_kg")} error={fieldError("weight_kg")} />
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
  onBlur,
  placeholder,
  type = "text",
  required = false,
  span = false,
  error,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  span?: boolean;
  error?: string;
  max?: string;
}) {
  return (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-[12px] font-extrabold text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        required={required}
        type={type}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/10"
            : "border-slate-200 focus:border-[#0ea5a4] focus:ring-[#0ea5a4]/10"
        }`}
      />
      {error ? (
        <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{error}</p>
      ) : null}
    </label>
  );
}

function todayInputValue() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
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
  onBlur,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-extrabold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:ring-4 ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/10"
            : "border-slate-200 focus:border-[#0ea5a4] focus:ring-[#0ea5a4]/10"
        }`}
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{error}</p>
      ) : null}
    </label>
  );
}
