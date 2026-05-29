"use client";
 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
 
type DoctorOption = {
  id: string;
  full_name: string;
  qualification: string | null;
};
 
type PatientForm = {
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
};
 
type Props = {
  clinicId: string;
  currentUserId: string;
  inviteCode: string;
  doctors: DoctorOption[];
};
 
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
 
const initialPatientForm: PatientForm = {
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
};
 
export function IntakeFormClient({
  clinicId,
  currentUserId,
  inviteCode,
  doctors,
}: Props) {
  const router = useRouter();
 
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState<PatientForm>(initialPatientForm);
 
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
 
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
 
  const emrNumber = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const random = String(Date.now()).slice(-5);
    return `HD-${inviteCode}-${yyyy}${mm}-${random}`;
  }, [inviteCode]);
 
  const fullName =
    patientForm.full_name.trim() ||
    buildFullName(patientForm.first_name, patientForm.last_name);
 
  function updatePatient<K extends keyof PatientForm>(key: K, value: PatientForm[K]) {
    setPatientForm((current) => {
      const previousAutoName = buildFullName(current.first_name, current.last_name);
      const next = { ...current, [key]: value };
      if (key === "first_name" || key === "last_name") {
        const nextAutoName = buildFullName(
          key === "first_name" ? value : next.first_name,
          key === "last_name" ? value : next.last_name,
        );
        if (!current.full_name.trim() || current.full_name.trim() === previousAutoName) {
          next.full_name = nextAutoName;
        }
      }
      if (key === "birthdate") {
        const ageFromBirthdate = calculateAge(value);
        next.age = ageFromBirthdate == null ? "" : String(ageFromBirthdate);
      }
      return next;
    });
  }
 
  function toNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
 
    const numberValue = Number(trimmed);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
 
  function normalizeSex(value: string) {
    if (value === "M" || value === "Male") return "M";
    if (value === "F" || value === "Female") return "F";
    if (value === "O" || value === "Other") return "O";
    return null;
  }
 
  function toggleDoctor(id: string) {
    setSelectedDoctors((current) =>
      current.includes(id)
        ? current.filter((doctorId) => doctorId !== id)
        : [...current, id],
    );
  }
 
  function validateForm() {
    if (!fullName) {
      return "Full name is required.";
    }
 
    if (patientForm.phone.trim() && patientForm.phone.trim() !== "+91") {
      if (!isValidPhone(patientForm.phone)) return "Enter a valid phone number.";
    }
 
    if (patientForm.emergency_contact.trim()) {
      if (!isValidPhone(patientForm.emergency_contact)) {
        return "Enter a valid emergency contact number.";
      }
    }
 
    if (patientForm.email.trim() && !isValidEmail(patientForm.email)) {
      return "Enter a valid email address.";
    }
 
    if (patientForm.postal_code.trim() && !isValidPostalCode(patientForm.postal_code)) {
      return "Enter a valid postal code.";
    }
 
    if (patientForm.birthdate) {
      const dob = new Date(`${patientForm.birthdate}T00:00:00`);
      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        return "Birthdate cannot be in the future.";
      }
    }
 
    const age = toNumber(patientForm.age);
    if (patientForm.age.trim() && (age == null || age < 0 || age > 130)) {
      return "Age must be between 0 and 130.";
    }
 
    const height = toNumber(patientForm.height_cm);
    if (patientForm.height_cm.trim() && (height == null || height < 0 || height > 250)) {
      return "Height must be between 0 and 250 cm.";
    }
 
    if (patientForm.blood_group && !BLOOD_GROUPS.includes(patientForm.blood_group)) {
      return "Select a valid blood group.";
    }
 
    if (selectedDoctors.length === 0) {
      return "Please assign at least one doctor.";
    }
 
    return null;
  }
 
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
 
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
 
    setSaving(true);
 
    try {
      const supabase = supabaseBrowser();
      const now = new Date().toISOString();
      const firstDoctorId = selectedDoctors[0];
      const normalizedPhone = normalizePhone(patientForm.phone);
      const patientPayload = {
        clinic_id: clinicId,
        doctor_id: firstDoctorId,
        first_name: nullableText(patientForm.first_name),
        last_name: nullableText(patientForm.last_name),
        full_name: fullName,
        birthdate: patientForm.birthdate || null,
        age: toNumber(patientForm.age),
        sex: normalizeSex(patientForm.sex),
        blood_group: patientForm.blood_group || null,
        height_cm: toNumber(patientForm.height_cm),
        phone: normalizedPhone,
        email: nullableText(patientForm.email),
        emergency_contact: nullableText(patientForm.emergency_contact),
        address: nullableText(patientForm.address),
        city: nullableText(patientForm.city),
        state: nullableText(patientForm.state),
        postal_code: nullableText(patientForm.postal_code),
        country: nullableText(patientForm.country),
        abha_id: nullableText(patientForm.abha_id),
        abha_address: nullableText(patientForm.abha_address),
        known_allergies: nullableText(patientForm.known_allergies),
        chronic_conditions: nullableText(patientForm.chronic_conditions),
        last_visit_at: now,
      };
 
      let patientId: string | null = null;
 
      if (normalizedPhone) {
        const { data: existingPatient, error: existingError } = await supabase
          .from("patients")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("doctor_id", firstDoctorId)
          .eq("phone", normalizedPhone)
          .eq("full_name", fullName)
          .maybeSingle();
 
        if (existingError) {
          throw new Error(existingError.message);
        }
 
        if (existingPatient?.id) {
          const { error: updatePatientError } = await supabase
            .from("patients")
            .update(patientPayload)
            .eq("id", existingPatient.id);
 
          if (updatePatientError) {
            throw new Error(updatePatientError.message);
          }
 
          patientId = existingPatient.id;
        }
      }
 
      if (!patientId) {
        const { data: patient, error: patientError } = await supabase
          .from("patients")
          .insert({
            ...patientPayload,
            emr_number: emrNumber,
          })
          .select("id")
          .single();
 
        if (patientError) {
          throw new Error(patientError.message);
        }
 
        patientId = patient.id;
      }
 
      const { data: visit, error: visitError } = await supabase
        .from("visits")
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          doctor_id: firstDoctorId,
          created_by: currentUserId,
          visit_date: now,
          status: "queued",
          bp_systolic: toNumber(bpSystolic),
          bp_diastolic: toNumber(bpDiastolic),
          pulse: toNumber(pulse),
          temperature_f: toNumber(temperature),
          spo2: toNumber(spo2),
          weight_kg: toNumber(weight),
          chief_complaints: nullableText(patientForm.chief_complaint),
        })
        .select("id")
        .single();
 
      if (visitError) {
        throw new Error(visitError.message);
      }
 
      const visitDoctorRows = selectedDoctors.map((doctorId) => ({
        visit_id: visit.id,
        doctor_id: doctorId,
        role: "attending",
      }));
 
      const { error: assignmentError } = await supabase
        .from("visit_doctors")
        .insert(visitDoctorRows);
 
      if (assignmentError) {
        throw new Error(assignmentError.message);
      }
 
      router.push("/emr");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <div className="mx-auto w-full max-w-[1280px] pb-24">
      <Link href="/emr" className="btn-secondary btn-sm mb-3">
        Back to Queue
      </Link>
 
      <section className="mb-4">
        <h1 className="text-[20px] font-extrabold tracking-tight text-slate-900">
          New Patient Intake
        </h1>
        <p className="mt-1 text-[12px] text-slate-500">
          Capture identity, vitals, and routing details for this visit.
        </p>
      </section>
 
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Step active>1 - Patient</Step>
        <Step>2 - Vitals optional</Step>
        <Step>3 - Assign Doctors</Step>
      </div>
 
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 lg:col-span-2">
            {error}
          </div>
        ) : null}
 
        <div className="card p-5 xl:col-span-2">
          <h2 className="mb-4 text-[13px] font-extrabold text-slate-900">
            1 - Patient
          </h2>
 
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormSection title="Basic Information" className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="First Name"
                  optional
                  value={patientForm.first_name}
                  onChange={(value) => updatePatient("first_name", value)}
                  placeholder="First name"
                />
                <TextField
                  label="Last Name"
                  optional
                  value={patientForm.last_name}
                  onChange={(value) => updatePatient("last_name", value)}
                  placeholder="Last name"
                />
                <TextField
                  label="Full Name"
                  required
                  value={patientForm.full_name}
                  onChange={(value) => updatePatient("full_name", value)}
                  placeholder="Full name"
                  className="sm:col-span-2"
                />
                <TextField
                  label="Birthdate"
                  optional
                  type="date"
                  value={patientForm.birthdate}
                  onChange={(value) => updatePatient("birthdate", value)}
                />
                <TextField
                  label="Age"
                  optional
                  type="number"
                  value={patientForm.age}
                  onChange={(value) => updatePatient("age", value)}
                  placeholder="Auto from birthdate"
                />
                <SelectField
                  label="Sex"
                  optional
                  value={patientForm.sex}
                  onChange={(value) => updatePatient("sex", value)}
                >
                  <option value="">Select</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </SelectField>
                <BloodGroupField
                  value={patientForm.blood_group}
                  onChange={(value) => updatePatient("blood_group", value)}
                />
                <TextField
                  label="Height (cm)"
                  optional
                  type="number"
                  value={patientForm.height_cm}
                  onChange={(value) => updatePatient("height_cm", value)}
                  placeholder="e.g. 165"
                />
              </div>
            </FormSection>
 
            <FormSection title="Contact Information">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Phone"
                  optional
                  value={patientForm.phone}
                  onChange={(value) => updatePatient("phone", value)}
                  placeholder="+91XXXXXXXXXX"
                />
                <TextField
                  label="Email"
                  optional
                  type="email"
                  value={patientForm.email}
                  onChange={(value) => updatePatient("email", value)}
                  placeholder="patient@example.com"
                />
                <TextField
                  label="Emergency Contact"
                  optional
                  value={patientForm.emergency_contact}
                  onChange={(value) => updatePatient("emergency_contact", value)}
                  placeholder="+91XXXXXXXXXX"
                  className="sm:col-span-2"
                />
              </div>
            </FormSection>
 
            <FormSection title="Address Details">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextAreaField
                  label="Address"
                  optional
                  value={patientForm.address}
                  onChange={(value) => updatePatient("address", value)}
                  placeholder="House number, street, locality"
                  className="sm:col-span-2"
                />
                <TextField
                  label="City"
                  optional
                  value={patientForm.city}
                  onChange={(value) => updatePatient("city", value)}
                  placeholder="Hyderabad"
                />
                <TextField
                  label="State"
                  optional
                  value={patientForm.state}
                  onChange={(value) => updatePatient("state", value)}
                  placeholder="Telangana"
                />
                <TextField
                  label="Postal Code"
                  optional
                  value={patientForm.postal_code}
                  onChange={(value) => updatePatient("postal_code", value)}
                  placeholder="500001"
                />
                <TextField
                  label="Country"
                  optional
                  value={patientForm.country}
                  onChange={(value) => updatePatient("country", value)}
                  placeholder="India"
                />
              </div>
            </FormSection>
 
            <FormSection title="Medical Information">
              <div className="grid grid-cols-1 gap-3">
                <TextField
                  label="Known Allergies"
                  optional
                  value={patientForm.known_allergies}
                  onChange={(value) => updatePatient("known_allergies", value)}
                  placeholder="e.g. Penicillin, Sulfa"
                />
                <TextField
                  label="Chronic Conditions"
                  optional
                  value={patientForm.chronic_conditions}
                  onChange={(value) => updatePatient("chronic_conditions", value)}
                  placeholder="e.g. Hypertension, Diabetes"
                />
                <TextAreaField
                  label="Chief Complaint"
                  optional
                  value={patientForm.chief_complaint}
                  onChange={(value) => updatePatient("chief_complaint", value)}
                  placeholder="Describe chief complaint..."
                />
              </div>
            </FormSection>
 
            <FormSection title="Government/ABHA Information">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="ABHA ID"
                  optional
                  value={patientForm.abha_id}
                  onChange={(value) => updatePatient("abha_id", value)}
                  placeholder="XX-XXXX-XXXX-XXXX"
                />
                <TextField
                  label="ABHA Address"
                  optional
                  value={patientForm.abha_address}
                  onChange={(value) => updatePatient("abha_address", value)}
                  placeholder="name@abdm"
                />
              </div>
            </FormSection>
          </div>
        </div>
 
        <div className="card h-fit p-5">
          <h2 className="mb-3 text-[13px] font-extrabold text-slate-900">
            2 - Vitals <span className="font-bold text-slate-500">(optional)</span>
          </h2>
 
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="BP Systolic (mmHg)"
                optional
                value={bpSystolic}
                onChange={setBpSystolic}
              />
              <TextField
                label="BP Diastolic (mmHg)"
                optional
                value={bpDiastolic}
                onChange={setBpDiastolic}
              />
            </div>
 
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Pulse (bpm)" optional value={pulse} onChange={setPulse} />
              <TextField label="Temp (F)" optional value={temperature} onChange={setTemperature} />
            </div>
 
            <div className="grid grid-cols-2 gap-3">
              <TextField label="SpO2 (%)" optional value={spo2} onChange={setSpo2} />
              <TextField label="Weight (kg)" optional value={weight} onChange={setWeight} />
            </div>
          </div>
        </div>
 
        <div className="card h-fit p-5">
          <h2 className="mb-1 text-[13px] font-extrabold text-slate-900">
            3 - Assign Doctors
          </h2>
 
          <p className="mb-3 text-[11px] text-slate-500">
            Check the doctors to assign this patient to.
          </p>
 
          <div className="divide-y divide-slate-200">
            {doctors.length === 0 ? (
              <div className="py-3 text-[12px] font-semibold text-rose-600">
                No doctors found for this clinic.
              </div>
            ) : (
              doctors.map((doctor) => (
                <label
                  key={doctor.id}
                  className="flex cursor-pointer items-center gap-2 py-2 text-[12px]"
                >
                  <input
                    type="checkbox"
                    checked={selectedDoctors.includes(doctor.id)}
                    onChange={() => toggleDoctor(doctor.id)}
                    className="h-3.5 w-3.5"
                  />
 
                  <span>
                    <span className="font-extrabold text-slate-900">
                      Dr. {doctor.full_name}
                    </span>{" "}
                    <span className="text-[11px] text-slate-500">
                      {doctor.qualification || "Doctor"}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
 
        <div className="flex items-center justify-between pb-10 xl:col-span-2">
          <Link href="/emr" className="btn-secondary">
            Cancel
          </Link>
 
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Route to Doctor"}
          </button>
        </div>
      </form>
    </div>
  );
}
 
function Step({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-xl border py-2.5 text-center text-[12px] font-extrabold ${
        active
          ? "border-[#0ea5a4] bg-[#ecfdfc] text-[#0f172a]"
          : "border-[rgba(15,23,42,0.08)] bg-white text-[#334155]"
      }`}
    >
      {children}
    </div>
  );
}
 
function FormSection({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-slate-50/45 p-3.5 ${className}`}>
      <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}
 
function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-[11px] font-bold text-slate-700">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
  );
}
 
function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  optional,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label optional={optional} required={required}>
        {label}
      </Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base h-10"
        placeholder={placeholder}
      />
    </div>
  );
}
 
function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label optional={optional} required={required}>
        {label}
      </Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base min-h-[78px] py-2"
        placeholder={placeholder}
      />
    </div>
  );
}
 
function SelectField({
  label,
  value,
  onChange,
  optional,
  required,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label optional={optional} required={required}>
        {label}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base h-10"
      >
        {children}
      </select>
    </div>
  );
}
 
function BloodGroupField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label optional>Blood Group</Label>
      <input
        list="blood-groups"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base h-10"
        placeholder="Search blood group"
      />
      <datalist id="blood-groups">
        {BLOOD_GROUPS.map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>
    </div>
  );
}
 
function buildFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
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
 
function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
 
function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "+91") return null;
  return trimmed;
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
 
 