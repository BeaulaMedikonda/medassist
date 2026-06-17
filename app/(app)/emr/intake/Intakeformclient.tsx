"use client";
 
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isoLocalDate } from "@/lib/utils";
import type { Patient } from "@/types/db";
 
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
  doctors: DoctorOption[];
};

type IntakeDraft = {
  patientForm: PatientForm;
  bpSystolic: string;
  bpDiastolic: string;
  pulse: string;
  temperature: string;
  spo2: string;
  weight: string;
  selectedDoctors: string[];
  immunizationSummary: string;
  painMapSummary: string;
  savedVisitId?: string;
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
  doctors,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
 
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState<PatientForm>(initialPatientForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);
  const [savedPatientId, setSavedPatientId] = useState(searchParams.get("patientId") || "");
  const [savedVisitId, setSavedVisitId] = useState(searchParams.get("visitId") || "");
 
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
 
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const pickedPatientId = pickedPatient?.id || "";
  const activePatientId = pickedPatient?.id || savedPatientId;
 
  const fullName =
    patientForm.full_name.trim() ||
    buildFullName(patientForm.first_name, patientForm.last_name);
  const [immunizationSummary, setImmunizationSummary] = useState(
    searchParams.get("immunizationSummary") || "",
  );
  const [painMapSummary, setPainMapSummary] = useState(
    searchParams.get("painMapSummary") || "",
  );
  const returnPatientHref = buildReturnHref(
    activePatientId,
    savedVisitId,
    immunizationSummary,
    painMapSummary,
  );
  const immunizationHref = activePatientId
    ? `/immunizations?patientId=${encodeURIComponent(activePatientId)}&visitId=${encodeURIComponent(savedVisitId)}&returnTo=${encodeURIComponent(returnPatientHref)}`
    : "/immunizations";
  const painMapHref = activePatientId
    ? `/dashboard?tool=pain-map&patientId=${encodeURIComponent(activePatientId)}&visitId=${encodeURIComponent(savedVisitId)}&returnTo=${encodeURIComponent(returnPatientHref)}`
    : "/dashboard?tool=pain-map";
  const visitCreated = Boolean(activePatientId && savedVisitId);
  const today = isoLocalDate();

  useEffect(() => {
    if (pickedPatient) return;

    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabaseBrowser()
          .from("patients")
          .select("*")
          .eq("clinic_id", clinicId)
          .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,emr_number.ilike.%${term}%`)
          .order("last_visit_at", { ascending: false, nullsFirst: false })
          .limit(8);

        if (!cancelled) setSearchResults((data || []) as Patient[]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [clinicId, pickedPatient, searchTerm]);

  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (!patientId || pickedPatient?.id === patientId) return;
    const loadedPatientId = patientId;

    let cancelled = false;
    async function loadPatient() {
      const { data } = await supabaseBrowser()
        .from("patients")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("id", loadedPatientId)
        .maybeSingle();

      if (!cancelled && data) {
        pickPatient(data as Patient);
        setSavedPatientId(loadedPatientId);
      }
    }

    void loadPatient();
    return () => {
      cancelled = true;
    };
  }, [clinicId, pickedPatient?.id, searchParams]);

  useEffect(() => {
    const nextImmunizationSummary = searchParams.get("immunizationSummary") || "";
    const nextPainMapSummary = searchParams.get("painMapSummary") || "";
    if (nextImmunizationSummary) setImmunizationSummary(nextImmunizationSummary);
    if (nextPainMapSummary) setPainMapSummary(nextPainMapSummary);
  }, [searchParams]);

  useEffect(() => {
    if (!pickedPatientId) return;
    const stored = window.sessionStorage.getItem(draftKey(pickedPatientId));
    if (!stored) return;

    try {
      const draft = JSON.parse(stored) as Partial<IntakeDraft>;
      if (draft.patientForm) setPatientForm(draft.patientForm);
      setBpSystolic(draft.bpSystolic || "");
      setBpDiastolic(draft.bpDiastolic || "");
      setPulse(draft.pulse || "");
      setTemperature(draft.temperature || "");
      setSpo2(draft.spo2 || "");
      setWeight(draft.weight || "");
      setSelectedDoctors(draft.selectedDoctors || []);
      if (draft.savedVisitId) setSavedVisitId(draft.savedVisitId);
      if (draft.immunizationSummary) {
        setImmunizationSummary((current) => current || draft.immunizationSummary || "");
      }
      if (draft.painMapSummary) {
        setPainMapSummary((current) => current || draft.painMapSummary || "");
      }
    } catch {
      window.sessionStorage.removeItem(draftKey(pickedPatientId));
    }
  }, [pickedPatientId]);

  useEffect(() => {
    if (!pickedPatient) return;
    const draft: IntakeDraft = {
      patientForm,
      bpSystolic,
      bpDiastolic,
      pulse,
      temperature,
      spo2,
      weight,
      selectedDoctors,
      immunizationSummary,
      painMapSummary,
      savedVisitId,
    };
    window.sessionStorage.setItem(draftKey(pickedPatient.id), JSON.stringify(draft));
  }, [
    bpDiastolic,
    bpSystolic,
    immunizationSummary,
    painMapSummary,
    patientForm,
    pickedPatient,
    pulse,
    savedVisitId,
    selectedDoctors,
    spo2,
    temperature,
    weight,
  ]);

  function pickPatient(patient: Patient) {
    setQueueNotice(null);
    setPickedPatient(patient);
    setSavedPatientId(patient.id);
    setSavedVisitId("");
    setSearchTerm("");
    setSearchResults([]);
    setPatientForm({
      first_name: patient.first_name || "",
      last_name: patient.last_name || "",
      full_name: patient.full_name || "",
      birthdate: patient.birthdate || "",
      age: patient.age == null ? "" : String(patient.age),
      sex: patient.sex || "",
      blood_group: patient.blood_group || "",
      height_cm: patient.height_cm == null ? "" : String(patient.height_cm),
      phone: patient.phone || "",
      email: patient.email || "",
      emergency_contact: patient.emergency_contact || "",
      address: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      postal_code: patient.postal_code || "",
      country: patient.country || initialPatientForm.country,
      known_allergies: patient.known_allergies || "",
      chronic_conditions: patient.chronic_conditions || "",
      chief_complaint: "",
      abha_id: patient.abha_id || "",
      abha_address: patient.abha_address || "",
    });
  }

  function clearPickedPatient() {
    setQueueNotice(null);
    setPickedPatient(null);
    setSavedPatientId("");
    setSavedVisitId("");
    setSearchTerm("");
    setSearchResults([]);
    setPatientForm(initialPatientForm);
    clearPatientContext();
  }

  function clearPatientContext() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("patientId");
    params.delete("visitId");
    params.delete("immunizationSummary");
    params.delete("painMapSummary");
    const query = params.toString();
    router.replace(query ? `/emr/new?${query}` : "/emr/new", { scroll: false });
  }
 
  function updatePatient<K extends keyof PatientForm>(key: K, value: PatientForm[K]) {
    setQueueNotice(null);
    setSavedVisitId("");
    let shouldClearContext = false;
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
      if (pickedPatient && isPatientIdentityField(key) && hasDifferentIdentity(next, pickedPatient)) {
        shouldClearContext = true;
      }
      return next;
    });

    if (shouldClearContext) {
      setPickedPatient(null);
      setSavedPatientId("");
      setSavedVisitId("");
      setSearchResults([]);
      clearPatientContext();
      setQueueNotice(
        "Existing patient selection was cleared because name or phone was changed. This intake will be matched again or created as a new patient.",
      );
    }
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
    setQueueNotice(null);
    setSavedVisitId("");
    setSelectedDoctors((current) =>
      current.includes(id)
        ? current.filter((doctorId) => doctorId !== id)
        : [...current, id],
    );
  }

  function updateVital(setter: (value: string) => void, value: string) {
    setQueueNotice(null);
    setSavedVisitId("");
    setter(value);
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
 
  function currentDraft(visitId = savedVisitId): IntakeDraft {
    return {
      patientForm,
      bpSystolic,
      bpDiastolic,
      pulse,
      temperature,
      spo2,
      weight,
      selectedDoctors,
      immunizationSummary,
      painMapSummary,
      savedVisitId: visitId,
    };
  }

  function saveDraft(patientId: string, visitId = savedVisitId) {
    window.sessionStorage.setItem(draftKey(patientId), JSON.stringify(currentDraft(visitId)));
  }

  async function createIntake({ clearDraftOnSuccess = false }: { clearDraftOnSuccess?: boolean } = {}) {
    setError(null);
    setQueueNotice(null);
 
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return null;
    }
 
    setSaving(true);
 
    try {
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
      };

      const res = await fetch("/api/intake/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: true,
          patientId: pickedPatient?.id,
          assignments: selectedDoctors.map((doctorId) => ({
            doctor_id: doctorId,
            role: "attending",
          })),
          patient: patientPayload,
          chiefComplaint: nullableText(patientForm.chief_complaint),
          vitals: {
          bp_systolic: toNumber(bpSystolic),
          bp_diastolic: toNumber(bpDiastolic),
          pulse: toNumber(pulse),
          temperature_f: toNumber(temperature),
          spo2: toNumber(spo2),
          weight_kg: toNumber(weight),
          },
        }),
      });
      const result = (await res.json().catch(() => ({}))) as {
        error?: string;
        patientId?: string;
        visitId?: string;
        reusedVisit?: boolean;
      };
      if (!res.ok) throw new Error(result.error || "Could not create EMR");

      if (clearDraftOnSuccess && pickedPatient?.id) {
        window.sessionStorage.removeItem(draftKey(pickedPatient.id));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndCreateVisit() {
    const result = await createIntake();
    if (!result?.patientId || !result.visitId) return;

    setSavedPatientId(result.patientId);
    setSavedVisitId(result.visitId);
    saveDraft(result.patientId, result.visitId);
    setQueueNotice(
      result.reusedVisit
        ? "Existing active visit was updated. Optional tools are now enabled."
        : "Patient visit saved and routed. Optional tools are now enabled.",
    );
    router.replace(buildReturnHref(result.patientId, result.visitId, immunizationSummary, painMapSummary), {
      scroll: false,
    });
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!visitCreated) {
      setError("Click Save before continuing.");
      return;
    }

    if (activePatientId) {
      window.sessionStorage.removeItem(draftKey(activePatientId));
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function openPainMap(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!activePatientId || !visitCreated) {
      setError("Click Save first. Graphic Pain Map can be added after the visit exists.");
      return;
    }
    saveDraft(activePatientId);

    const nextReturnHref = buildReturnHref(
      activePatientId,
      savedVisitId,
      immunizationSummary,
      painMapSummary,
    );
    router.replace(
      `/dashboard?tool=pain-map&patientId=${encodeURIComponent(activePatientId)}&visitId=${encodeURIComponent(savedVisitId)}&returnTo=${encodeURIComponent(nextReturnHref)}`,
    );
    router.refresh();
  }

  async function openImmunization(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!activePatientId || !visitCreated) {
      setError("Click Save first. Immunization can be added after the visit exists.");
      return;
    }
    saveDraft(activePatientId);

    const nextReturnHref = buildReturnHref(
      activePatientId,
      savedVisitId,
      immunizationSummary,
      painMapSummary,
    );
    router.replace(
      `/immunizations?patientId=${encodeURIComponent(activePatientId)}&visitId=${encodeURIComponent(savedVisitId)}&returnTo=${encodeURIComponent(nextReturnHref)}`,
    );
    router.refresh();
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
 
  return (
    <div className="mx-auto w-full max-w-[1280px] pb-24">
      <Link href="/emr" className="btn-secondary btn-sm mb-3">
        Back to Queue
      </Link>
 
      <section className="mb-4">
        <h1 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">
          New Patient Intake
        </h1>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-ink-300">
          Capture identity, vitals, and routing details for this visit.
        </p>
      </section>

      <div className="relative mb-5">
        {pickedPatient ? (
          <div>
            <Label optional>Search existing patient</Label>
            <div className="rounded-xl border border-[#0ea5a4]/30 bg-[#ecfdfc] px-3 py-2 dark:border-brand-500/40 dark:bg-brand-900/25">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-extrabold text-slate-900 dark:text-white">
                    {pickedPatient.full_name}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-ink-300">
                    {pickedPatient.emr_number}
                    {pickedPatient.phone ? ` - ${pickedPatient.phone}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearPickedPatient}
                  className="text-[11px] font-extrabold text-[#0f8f83] hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <TextField
              label="Search existing patient"
              optional
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Name, phone, or EMR ID"
            />
            {searchResults.length > 0 ? (
              <ul className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900">
                {searchResults.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => pickPatient(patient)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-ink-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-extrabold text-slate-900 dark:text-white">
                          {patient.full_name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500 dark:text-ink-300">
                          {patient.emr_number}
                          {patient.phone ? ` - ${patient.phone}` : ""}
                        </span>
                      </span>
                      {patient.age != null || patient.sex ? (
                        <span className="shrink-0 text-[11px] text-slate-400 dark:text-ink-400">
                          {[patient.age, patient.sex].filter(Boolean).join(" / ")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {searching ? (
              <span className="absolute right-3 top-8 text-[11px] text-slate-400 dark:text-ink-400">
                searching...
              </span>
            ) : null}
          </>
        )}
      </div>
 
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Step active onClick={() => scrollToSection("patient-section")}>
          1 - Patient
        </Step>
        <Step onClick={() => scrollToSection("vitals-section")}>
          2 - Vitals optional
        </Step>
        <Step onClick={() => scrollToSection("doctors-section")}>
          3 - Assign Doctors
        </Step>
      </div>
 
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 lg:col-span-2">
            {error}
          </div>
        ) : null}
        {queueNotice && !saving ? (
          <div className="rounded-xl border border-[#0ea5a4]/30 bg-[#ecfdfc] px-4 py-3 text-sm font-semibold text-[#0f766e] lg:col-span-2">
            {queueNotice}
          </div>
        ) : null}
 
        <div id="patient-section" className="card scroll-mt-6 p-5 xl:col-span-2">
          <h2 className="mb-4 text-[13px] font-extrabold text-slate-900 dark:text-white">
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
                  max={today}
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
                  label="Gender"
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
 
        <div id="vitals-section" className="card h-fit scroll-mt-6 p-5">
          <h2 className="mb-3 text-[13px] font-extrabold text-slate-900 dark:text-white">
            2 - Vitals <span className="font-bold text-slate-500 dark:text-ink-300">(optional)</span>
          </h2>
 
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="BP Systolic (mmHg)"
                optional
                value={bpSystolic}
                onChange={(value) => updateVital(setBpSystolic, value)}
              />
              <TextField
                label="BP Diastolic (mmHg)"
                optional
                value={bpDiastolic}
                onChange={(value) => updateVital(setBpDiastolic, value)}
              />
            </div>
 
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Pulse (bpm)" optional value={pulse} onChange={(value) => updateVital(setPulse, value)} />
              <TextField label="Temp (F)" optional value={temperature} onChange={(value) => updateVital(setTemperature, value)} />
            </div>
 
            <div className="grid grid-cols-2 gap-3">
              <TextField label="SpO2 (%)" optional value={spo2} onChange={(value) => updateVital(setSpo2, value)} />
              <TextField label="Weight (kg)" optional value={weight} onChange={(value) => updateVital(setWeight, value)} />
            </div>
          </div>
        </div>
 
        <div id="doctors-section" className="card h-fit scroll-mt-6 p-5">
          <h2 className="mb-1 text-[13px] font-extrabold text-slate-900 dark:text-white">
            3 - Assign Doctors
          </h2>
 
          <p className="mb-3 text-[11px] text-slate-500 dark:text-ink-300">
            Check the doctors to assign this patient to.
          </p>
 
          <div className="divide-y divide-slate-200 dark:divide-ink-700">
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
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      Dr. {doctor.full_name}
                    </span>{" "}
                    <span className="text-[11px] text-slate-500 dark:text-ink-300">
                      {doctor.qualification || "Doctor"}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => void saveAndCreateVisit()}
            disabled={saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : visitCreated ? "Saved" : "Save"}
          </button>
          {error ? (
            <p className="max-w-xl text-right text-xs font-semibold text-rose-600">
              {error}
            </p>
          ) : queueNotice && !saving ? (
            <p className="max-w-xl text-right text-xs font-semibold text-[#0f766e]">
              {queueNotice}
            </p>
          ) : null}
        </div>
 
        <div className="card xl:col-span-2 p-5">
          <h2 className="mb-3 text-[13px] font-extrabold text-slate-900 dark:text-white">
            Optional Tools
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={immunizationHref}
              onClick={openImmunization}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#0ea5a4]/50 hover:bg-[#ecfdfc] dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-400/60 dark:hover:bg-ink-800"
            >
              <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white">
                Immunization
              </span>
              <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-ink-300">
                {immunizationSummary || (pickedPatient ? "Immunization Registry" : "Save patient first")}
              </span>
            </Link>
            <Link
              href={painMapHref}
              onClick={openPainMap}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#0ea5a4]/50 hover:bg-[#ecfdfc] dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-400/60 dark:hover:bg-ink-800"
            >
              <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white">
                Graphic Pain Map
              </span>
              <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-ink-300">
                {painMapSummary || (pickedPatient ? "MA Dashboard" : "Save patient first")}
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between pb-10 xl:col-span-2">
          <Link href="/emr" className="btn-secondary">
            Cancel
          </Link>
 
          <button
            type="submit"
            disabled={!visitCreated}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
 
function Step({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border py-2.5 text-center text-[12px] font-extrabold transition hover:border-[#0ea5a4] hover:bg-[#ecfdfc] focus:outline-none focus:ring-2 focus:ring-[#0ea5a4]/30 dark:hover:border-brand-400 dark:hover:bg-ink-800 ${
        active
          ? "border-[#0ea5a4] bg-[#ecfdfc] text-[#0f172a] dark:border-brand-400 dark:bg-brand-400 dark:text-ink-950"
          : "border-[rgba(15,23,42,0.08)] bg-white text-[#334155] dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
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
    <section className={`rounded-2xl border border-slate-100 bg-slate-50/45 p-3.5 dark:border-ink-700/70 dark:bg-ink-900/70 ${className}`}>
      <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-ink-200">
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
    <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-ink-200">
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
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  required?: boolean;
  className?: string;
  max?: string;
}) {
  return (
    <div className={className}>
      <Label optional={optional} required={required}>
        {label}
      </Label>
      <input
        type={type}
        value={value}
        max={max}
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

function draftKey(patientId: string) {
  return `new-emr-draft:${patientId}`;
}

function buildReturnHref(
  patientId: string | undefined,
  visitId: string | undefined,
  immunizationSummary: string,
  painMapSummary: string,
) {
  if (!patientId) return "/emr/new";

  const params = new URLSearchParams({ patientId });
  if (visitId) {
    params.set("visitId", visitId);
  }
  if (immunizationSummary) {
    params.set("immunizationSummary", immunizationSummary);
  }
  if (painMapSummary) {
    params.set("painMapSummary", painMapSummary);
  }

  return `/emr/new?${params.toString()}`;
}
 
function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "+91") return null;
  return trimmed;
}

function isPatientIdentityField(key: keyof PatientForm) {
  return key === "first_name" || key === "last_name" || key === "full_name" || key === "phone";
}

function hasDifferentIdentity(form: PatientForm, patient: Patient) {
  const formName = (form.full_name.trim() || buildFullName(form.first_name, form.last_name)).toLowerCase();
  const patientName = (patient.full_name || "").trim().toLowerCase();
  const formPhone = normalizePhone(form.phone) || "";
  const patientPhone = normalizePhone(patient.phone || "") || "";

  return formName !== patientName || formPhone !== patientPhone;
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
 
 
