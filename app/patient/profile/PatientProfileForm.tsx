"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PainMarker } from "@/components/patient/BodyPainDiagram";
import type { Immunization, Patient } from "@/types/db";

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

type ImmunizationForm = {
  vaccine_name: string;
  date_given: string;
  next_due_date: string;
  dose: string;
  notes: string;
};

const PAIN_TYPES = ["Sharp", "Dull", "Burning", "Aching", "Throbbing", "Stabbing", "Cramping"];

const SEX_OPTIONS = [
  { value: "", label: "Select" },
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Others", label: "Others" },
];

const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Search blood group" },
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
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<{ title: string; detail?: string; tone: "error" | "success" } | null>(null);
  const [showPainMap, setShowPainMap] = useState(false);
  const [showImmunization, setShowImmunization] = useState(false);
  const [immunizationRecords, setImmunizationRecords] = useState<Immunization[]>([]);
  const [painMarkers, setPainMarkers] = useState<PainMarker[]>([]);
  const [painIntensity, setPainIntensity] = useState(5);
  const [painType, setPainType] = useState("Sharp");
  const [form, setForm] = useState<ProfileForm>(() => ({
    first_name: patient.first_name || "",
    last_name: patient.last_name || "",
    full_name: patient.full_name || "",
    birthdate: patient.birthdate || "",
    age: patient.age ? String(patient.age) : "",
    sex: displaySex(patient.sex || ""),
    blood_group: patient.blood_group || "",
    height_cm: patient.height_cm ? String(patient.height_cm) : "",
    phone: (patient.phone || "").replace(/\D/g, "").slice(-10) || "+91",
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
  const today = todayInputValue();

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

  function buildPainSummary(markers: PainMarker[]) {
    if (markers.length === 0) return "";
    return markers
      .map((m) => `${m.painType} pain (${m.intensity}/10) at ${m.location} (${m.side})`)
      .join(". ") + ".";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setNotice({ title: "Missing details", detail: "Full name is required.", tone: "error" });
      return;
    }
    if (!form.phone.trim() || form.phone === "+91") {
      setNotice({ title: "Missing details", detail: "Phone number is required.", tone: "error" });
      return;
    }
    if (form.birthdate && form.birthdate > today) {
      setNotice({ title: "Invalid birthdate", detail: "Birthdate cannot be in the future.", tone: "error" });
      return;
    }

    setBusy(true);
    setNotice(null);
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

      setNotice({ title: "Successfully completed", detail: "Your details were sent to the medical assistant for review.", tone: "success" });
      setSubmitted(true);
      router.refresh();
    } catch (err: unknown) {
      setNotice({
        title: "Submit failed",
        detail: err instanceof Error ? err.message : "Could not submit details",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <HeaderBlock patientName={form.full_name || patient.full_name || "Patient"} />
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-extrabold text-emerald-800">Successfully submitted</p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            Your details have been sent to the medical assistant for review and doctor assignment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="h-9 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm hover:border-teal-200 hover:text-[#0c8a89]"
        >
          Edit Details
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <HeaderBlock patientName={form.full_name || patient.full_name || "Patient"} />
      {notice ? <InlineNotice notice={notice} /> : null}

      <Panel title="Personal Details">
        <SubPanel title="Basic Information">
          <Field label="First Name" value={form.first_name} onChange={(value) => update("first_name", value)} placeholder="First name" />
          <Field label="Last Name" value={form.last_name} onChange={(value) => update("last_name", value)} placeholder="Last name" />
          <Field required label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} placeholder="Full name" span />
          <Field label="Birthdate" type="date" value={form.birthdate} max={today} onChange={(value) => update("birthdate", value)} />
          <Field label="Age" value={form.age || computedAge} onChange={(value) => update("age", value)} placeholder="Auto from birthdate" />
          <Select label="Sex" value={form.sex} onChange={(value) => update("sex", value)} options={SEX_OPTIONS} />
          <Select label="Blood Group" value={form.blood_group} onChange={(value) => update("blood_group", value)} options={BLOOD_GROUP_OPTIONS} />
          <Field label="Height (cm)" value={form.height_cm} onChange={(value) => update("height_cm", value)} placeholder="e.g. 165" />
        </SubPanel>

        <div className="grid gap-3 lg:grid-cols-2">
          <SubPanel title="Contact Information">
            <Field required label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+91" />
            <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="patient@example.com" />
            <Field label="Emergency Contact" value={form.emergency_contact} onChange={(value) => update("emergency_contact", value)} placeholder="+91XXXXXXXXXX" span />
          </SubPanel>

          <SubPanel title="Address Details">
            <Textarea label="Address" value={form.address} onChange={(value) => update("address", value)} placeholder="House number, street, locality" span />
            <Field label="City" value={form.city} onChange={(value) => update("city", value)} placeholder="Hyderabad" />
            <Field label="State" value={form.state} onChange={(value) => update("state", value)} placeholder="Telangana" />
            <Field label="Postal Code" value={form.postal_code} onChange={(value) => update("postal_code", value)} placeholder="500001" />
            <Field label="Country" value={form.country} onChange={(value) => update("country", value)} />
          </SubPanel>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <SubPanel title="Medical Information">
            <Field label="Known Allergies" value={form.known_allergies} onChange={(value) => update("known_allergies", value)} placeholder="e.g. Penicillin, Sulfa" span />
            <Field label="Chronic Conditions" value={form.chronic_conditions} onChange={(value) => update("chronic_conditions", value)} placeholder="e.g. Hypertension, Diabetes" span />
            <Textarea label="Chief Complaint" value={form.chief_complaint} onChange={(value) => update("chief_complaint", value)} placeholder="Describe chief complaint..." span />
          </SubPanel>

          <SubPanel title="Government / ABHA Information">
            <Field label="ABHA ID" value={form.abha_id} onChange={(value) => update("abha_id", value)} placeholder="XX-XXXX-XXXX-XXXX" />
            <Field label="ABHA Address" value={form.abha_address} onChange={(value) => update("abha_address", value)} placeholder="name@abdm" />
          </SubPanel>
        </div>
      </Panel>

      <Panel title="Vitals optional">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="BP Systolic (mmHg)" value={form.bp_systolic} onChange={(value) => update("bp_systolic", value)} />
          <Field label="BP Diastolic (mmHg)" value={form.bp_diastolic} onChange={(value) => update("bp_diastolic", value)} />
          <Field label="Pulse (bpm)" value={form.pulse} onChange={(value) => update("pulse", value)} />
          <Field label="Temp (F)" value={form.temperature_f} onChange={(value) => update("temperature_f", value)} />
          <Field label="SpO2 (%)" value={form.spo2} onChange={(value) => update("spo2", value)} />
          <Field label="Weight (kg)" value={form.weight_kg} onChange={(value) => update("weight_kg", value)} />
        </div>
      </Panel>

      <Panel title="Optional Tools">
        <div className="grid gap-3 md:grid-cols-2">
          <ToolCard
            title="Immunization"
            detail={
              immunizationRecords.length
                ? `${immunizationRecords.length} vaccine record saved`
                : "Save optional shot details"
            }
            onClick={() => setShowImmunization(true)}
          />
          <button
            type="button"
            onClick={() => setShowPainMap(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50"
          >
            <p className="text-xs font-extrabold text-slate-800">Graphic Pain Map</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              {painMarkers.length ? `${painMarkers.length} pain point marked` : "Tap to mark pain"}
            </p>
          </button>
        </div>
      </Panel>

      {showPainMap ? (
        <PainMapModal
          patientName={form.full_name || patient.full_name || "Current portal submission"}
          markers={painMarkers}
          painType={painType}
          painIntensity={painIntensity}
          onPainTypeChange={setPainType}
          onPainIntensityChange={setPainIntensity}
          onAddMarker={(marker) => setPainMarkers((prev) => [...prev, marker])}
          onRemoveMarker={(id) => setPainMarkers((prev) => prev.filter((m) => m.id !== id))}
          onClear={() => setPainMarkers([])}
          onClose={() => setShowPainMap(false)}
          onSave={() => setShowPainMap(false)}
        />
      ) : null}

      {showImmunization ? (
        <ImmunizationModal
          patientName={form.full_name || patient.full_name || "Patient"}
          onClose={() => setShowImmunization(false)}
          onSaved={(record) => {
            setImmunizationRecords((current) => [record, ...current]);
            setShowImmunization(false);
            setNotice({
              title: "Immunization saved",
              detail: "Your vaccine record was added to your portal.",
              tone: "success",
            });
            router.refresh();
          }}
        />
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold text-slate-400">
          Your updates will be sent to clinic staff for review.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-full bg-[#0ea5a4] px-6 text-xs font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(14,165,164,0.8)] hover:bg-[#0c8a89] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Submitting..." : "Submit changes for clinic review"}
        </button>
      </div>
    </form>
  );
}

function HeaderBlock({ patientName }: { patientName: string }) {
  return (
    <div>
      <p className="text-[20px] font-extrabold tracking-tight text-slate-950">My Health Details</p>
      <p className="mt-1 text-[12px] font-semibold text-slate-400">
        Review and update details for {patientName}.
      </p>
    </div>
  );
}

function InlineNotice({
  notice,
}: {
  notice: { title: string; detail?: string; tone: "error" | "success" };
}) {
  const classes =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <p className="text-xs font-extrabold">{notice.title}</p>
      {notice.detail ? <p className="mt-1 text-xs font-semibold opacity-80">{notice.detail}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_12px_28px_-18px_rgba(15,23,42,0.35)]">
      <h2 className="mb-3 text-[12px] font-extrabold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ToolCard({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick?: () => void;
}) {
  const classes =
    "rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        <p className="text-xs font-extrabold text-slate-800">{title}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">{detail}</p>
      </button>
    );
  }

  return (
    <div className={classes}>
      <p className="text-xs font-extrabold text-slate-800">{title}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{detail}</p>
    </div>
  );
}

function ImmunizationModal({
  patientName,
  onClose,
  onSaved,
}: {
  patientName: string;
  onClose: () => void;
  onSaved: (record: Immunization) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ImmunizationForm>(() => ({
    vaccine_name: "",
    date_given: todayInputValue(),
    next_due_date: "",
    dose: "",
    notes: "",
  }));

  function update<K extends keyof ImmunizationForm>(key: K, value: ImmunizationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveRecord() {
    if (!form.vaccine_name.trim() || !form.date_given) {
      setError("Enter the vaccine name and date given.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/immunizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaccineName: form.vaccine_name,
          cvxCode: null,
          dateGiven: form.date_given,
          dose: form.dose,
          nextDueDate: form.next_due_date || null,
          status: "completed",
          notes: form.notes,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as {
        immunization?: Immunization;
        error?: string;
      };
      if (!res.ok || !result.immunization) {
        throw new Error(result.error || "Could not save immunization.");
      }
      onSaved(result.immunization);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save immunization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close immunization panel overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add vaccine record"
        className="relative z-10 flex max-h-[calc(100vh-48px)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.75)]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-950">Add Vaccine Record</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">For {patientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close panel"
          >
            <svg className="h-5 w-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <ImmunizationField label="Vaccine Name" span>
                <input
                  value={form.vaccine_name}
                  onChange={(event) => update("vaccine_name", event.target.value)}
                  placeholder="e.g. Tdap"
                  className="input-base h-12 rounded-xl px-4 text-sm font-semibold"
                />
              </ImmunizationField>
              <ImmunizationField label="Date Received">
                <input
                  type="date"
                  value={form.date_given}
                  onChange={(event) => update("date_given", event.target.value)}
                  className="input-base h-12 rounded-xl px-4 text-sm font-semibold"
                />
              </ImmunizationField>
              <ImmunizationField label="Next Due (Optional)">
                <input
                  type="date"
                  value={form.next_due_date}
                  onChange={(event) => update("next_due_date", event.target.value)}
                  className="input-base h-12 rounded-xl px-4 text-sm font-semibold"
                />
              </ImmunizationField>
              <ImmunizationField label="Dose (Optional)" span>
                <input
                  value={form.dose}
                  onChange={(event) => update("dose", event.target.value)}
                  placeholder="0.5 mL"
                  className="input-base h-12 rounded-xl px-4 text-sm font-semibold"
                />
              </ImmunizationField>
            </div>

            <ImmunizationField label="Notes" span>
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Reaction, counseling, source document..."
                rows={5}
                className="input-base min-h-[110px] resize-y rounded-xl px-4 py-3 text-sm font-semibold"
              />
            </ImmunizationField>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => void saveRecord()}
            disabled={saving}
            className="h-12 w-full rounded-full bg-[#14b8b5] text-sm font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(20,184,181,0.8)] transition hover:bg-[#0ea5a4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save vaccine record"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImmunizationField({
  label,
  children,
  span = false,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <label className={span ? "col-span-2 block" : "block"}>
      <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function PainMapModal({
  patientName,
  markers,
  painType,
  painIntensity,
  onPainTypeChange,
  onPainIntensityChange,
  onAddMarker,
  onRemoveMarker,
  onClear,
  onClose,
  onSave,
}: {
  patientName: string;
  markers: PainMarker[];
  painType: string;
  painIntensity: number;
  onPainTypeChange: (value: string) => void;
  onPainIntensityChange: (value: number) => void;
  onAddMarker: (marker: PainMarker) => void;
  onRemoveMarker: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/35 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-[1320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.75)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-950">Graphic Pain Map</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Click anywhere on the body to mark a pain location. Click a marker to remove it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 shadow-sm hover:border-slate-300"
          >
            Close
          </button>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] xl:hidden">
              <label>
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  Patient
                </span>
                <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-800">
                  {patientName}
                </div>
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  Pain Type
                </span>
                <select
                  value={painType}
                  onChange={(e) => onPainTypeChange(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/10"
                >
                  {PAIN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <PainBodyPanel
                side="front"
                markers={markers}
                painType={painType}
                painIntensity={painIntensity}
                onAddMarker={onAddMarker}
                onRemoveMarker={onRemoveMarker}
              />
              <PainBodyPanel
                side="back"
                markers={markers}
                painType={painType}
                painIntensity={painIntensity}
                onAddMarker={onAddMarker}
                onRemoveMarker={onRemoveMarker}
              />
            </div>

            <div className="xl:pr-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Pain Intensity (0-10) - <span className="font-extrabold text-[#0c8a89]">{painIntensity}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={painIntensity}
                onChange={(e) => onPainIntensityChange(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#22c7bd]"
              />
            </div>
          </div>

          <aside className="space-y-5">
            <div className="hidden space-y-3 xl:block">
              <label>
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  Patient
                </span>
                <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-800">
                  {patientName}
                </div>
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  Pain Type
                </span>
                <select
                  value={painType}
                  onChange={(e) => onPainTypeChange(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/10"
                >
                  {PAIN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Legend</p>
              <div className="space-y-2 text-xs font-extrabold text-slate-700">
                <LegendItem color="bg-red-500" label="Severe (8-10)" />
                <LegendItem color="bg-amber-500" label="Moderate (4-7)" />
                <LegendItem color="bg-emerald-500" label="Mild (1-3)" />
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Marked Points
              </p>
              <PainMarkerList markers={markers} onRemove={onRemoveMarker} compact />
            </div>

            <button
              type="button"
              onClick={onClear}
              disabled={markers.length === 0}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-400 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-11 w-full rounded-xl bg-[#7ed8ce] text-xs font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(20,184,166,0.8)] transition hover:bg-[#22c7bd]"
            >
              Save Pain Map
            </button>

            <div>
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Saved Pain Maps
              </p>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs font-semibold text-slate-400">
                Saved history will appear here after clinic records are connected.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function PainBodyPanel({
  side,
  markers,
  painType,
  painIntensity,
  onAddMarker,
  onRemoveMarker,
}: {
  side: "front" | "back";
  markers: PainMarker[];
  painType: string;
  painIntensity: number;
  onAddMarker: (marker: PainMarker) => void;
  onRemoveMarker: (id: string) => void;
}) {
  const sideMarkers = markers.filter((marker) => marker.side === side);

  function addMarker(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddMarker({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      side,
      x,
      y,
      location: painRegion(x, y, side),
      intensity: painIntensity,
      painType,
    });
  }

  return (
    <div>
      <p className="mb-2 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
        {side}
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <svg
          viewBox="0 0 260 570"
          onClick={addMarker}
          className="mx-auto block h-[570px] max-h-[72vh] w-full max-w-[390px] cursor-crosshair select-none"
          aria-label={`${side} body pain map`}
        >
          <PainBodyShapes side={side} />
          {sideMarkers.map((marker, index) => (
            <g
              key={marker.id}
              transform={`translate(${(marker.x / 100) * 260}, ${(marker.y / 100) * 570})`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMarker(marker.id);
              }}
              className="cursor-pointer"
            >
              <circle r="10" fill={painColor(marker.intensity)} opacity="0.95" />
              <circle r="10" fill="none" stroke="white" strokeWidth="2" opacity="0.85" />
              <text textAnchor="middle" dy="0.35em" fontSize="9" fontWeight="800" fill="white">
                {index + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function PainBodyShapes({ side }: { side: "front" | "back" }) {
  const stroke = side === "front" ? "#3b82ff" : "#6366ff";
  const fill = "#dff3fb";
  const label = side === "front" ? "#93c5fd" : "#a5b4fc";

  return (
    <g fill={fill} stroke={stroke} strokeWidth="5" strokeLinejoin="round">
      <circle cx="130" cy="64" r="44" />
      <rect x="118" y="108" width="24" height="27" rx="12" />

      <ellipse cx="80" cy="148" rx="31" ry="36" />
      <ellipse cx="180" cy="148" rx="31" ry="36" />
      <ellipse cx="48" cy="284" rx="25" ry="39" />
      <ellipse cx="212" cy="284" rx="25" ry="39" />

      <rect x="39" y="132" width="37" height="124" rx="17" />
      <rect x="184" y="132" width="37" height="124" rx="17" />
      <rect x="72" y="128" width="116" height="100" rx="13" />
      <rect x="74" y="220" width="112" height="76" rx="13" />
      <rect x="83" y="295" width="94" height="60" rx="13" />

      <rect x="84" y="355" width="47" height="112" rx="15" />
      <rect x="133" y="355" width="47" height="112" rx="15" />
      <rect x="92" y="466" width="37" height="85" rx="15" />
      <rect x="135" y="466" width="37" height="85" rx="15" />
      <ellipse cx="105" cy="552" rx="25" ry="10" />
      <ellipse cx="159" cy="552" rx="25" ry="10" />
      <g fill={label} stroke="none" fontSize="14" fontWeight="800" textAnchor="middle">
        {side === "front" ? (
          <>
            <text x="130" y="190">Chest</text>
            <text x="130" y="255">Abdomen</text>
            <text x="107" y="410">L-Thigh</text>
            <text x="157" y="410">R-Thigh</text>
          </>
        ) : (
          <>
            <text x="130" y="194">Upper Back</text>
            <text x="130" y="256">Lower Back</text>
            <text x="107" y="410">L-Glute</text>
            <text x="157" y="410">R-Glute</text>
          </>
        )}
      </g>
    </g>
  );
}

function PainControls({
  painType,
  painIntensity,
  onPainTypeChange,
  onPainIntensityChange,
}: {
  painType: string;
  painIntensity: number;
  onPainTypeChange: (value: string) => void;
  onPainIntensityChange: (value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-[12px] font-extrabold text-slate-700">Pain Type</span>
        <div className="flex flex-wrap gap-2">
          {PAIN_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onPainTypeChange(type)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-extrabold transition ${
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
          <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-extrabold text-[#0c8a89]">
            {painIntensity} / 10
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={painIntensity}
          onChange={(e) => onPainIntensityChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#0ea5a4]"
        />
      </div>
    </div>
  );
}

function PainMarkerList({
  markers,
  onRemove,
  compact = false,
}: {
  markers: PainMarker[];
  onRemove: (id: string) => void;
  compact?: boolean;
}) {
  if (markers.length === 0) {
    return (
      <p className={compact ? "text-xs font-semibold text-slate-400" : "rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs font-semibold text-slate-400"}>
        No markers yet
      </p>
    );
  }

  return (
    <div className={compact ? "max-h-48 space-y-2 overflow-y-auto pr-1" : "space-y-2"}>
      {markers.map((marker, index) => (
        <div key={marker.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
          <div className="text-xs font-bold text-slate-700">
            {index + 1}. {marker.location}
            <span className="ml-1 text-slate-400">({marker.side})</span>
            <span className="ml-2 text-slate-400">{marker.painType} - {marker.intensity}/10</span>
          </div>
          <button type="button" onClick={() => onRemove(marker.id)} className="text-xs font-extrabold text-rose-400">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function painColor(intensity: number) {
  if (intensity <= 3) return "#10b981";
  if (intensity <= 7) return "#f59e0b";
  return "#ef4444";
}

function painRegion(x: number, y: number, side: "front" | "back") {
  if (y < 17) return "Head";
  if (y < 25) return "Neck";
  if (x < 28) return y < 56 ? "Left Arm" : "Left Hand";
  if (x > 72) return y < 56 ? "Right Arm" : "Right Hand";
  if (y < 41) return side === "front" ? "Chest" : "Upper Back";
  if (y < 53) return side === "front" ? "Abdomen" : "Lower Back";
  if (y < 63) return side === "front" ? "Pelvis" : "Glute";
  if (y < 82) return x < 50 ? "Left Thigh" : "Right Thigh";
  return x < 50 ? "Left Leg / Foot" : "Right Leg / Foot";
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
  max,
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
  max?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-[10px] font-extrabold text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        data-patient-field
        required={required}
        type={type}
        maxLength={maxLength}
        max={max}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/10"
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
      <span className="mb-1.5 block text-[10px] font-extrabold text-slate-700">{label}</span>
      <textarea
        data-patient-field
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/10"
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
      <span className="mb-1.5 block text-[10px] font-extrabold text-slate-700">{label}</span>
      <select
        data-patient-field
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/10"
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

function todayInputValue() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
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
