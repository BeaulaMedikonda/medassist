//app/(app)/emr/EmrListClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Patient } from "@/types/db";
import type { LatestVisit, PatientFilter, PatientSummary, PatientVisitItem } from "./page";

type ReferralDoctor = {
  id: string;
  full_name: string;
};

type QuickAction = "vitals" | "labs" | "prescribe" | "carePlan";

type Props = {
  clinicId: string;
  currentUserId: string;
  clinicName: string;
  initialQuery: string;
  initialFilter: PatientFilter;
  patients: Patient[];
  latestVisit: Record<string, LatestVisit>;
  latestVitalsVisit: Record<string, LatestVisit>;
  patientVisits: Record<string, PatientVisitItem[]>;
  patientSummaries: Record<string, PatientSummary[]>;
  referralDoctors: ReferralDoctor[];
  error: string | null;
  counts: {
    all: number;
    today: number;
    visited: number;
    chronic: number;
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function displaySex(value: string | null | undefined) {
  if (!value) return "—";
  if (value === "M") return "male";
  if (value === "F") return "female";
  if (value === "O") return "other";
  return value.toLowerCase();
}

function ageSex(patient: Patient) {
  const age = patient.age != null ? `${patient.age}y` : "—";
  const sex = displaySex(patient.sex);

  if (age === "—" && sex === "—") return "—";
  if (age !== "—" && sex !== "—") return `${age} / ${sex}`;
  if (age !== "—") return age;

  return sex;
}

function modalAgeSex(patient: Patient) {
  const parts: string[] = [];

  if (patient.age != null) {
    parts.push(`${patient.age}`);
  }

  if (patient.sex) {
    parts.push(displaySex(patient.sex));
  }

  if (patient.blood_group) {
    parts.push(patient.blood_group);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function formatBirthdate(value: string | null | undefined) {
  if (!value) return "â€”";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "â€”";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function patientAddress(patient: Patient) {
  return [
    patient.address,
    patient.city,
    patient.state,
    patient.postal_code,
    patient.country,
  ]
    .filter(Boolean)
    .join(", ") || "â€”";
}

function formatPatientBirthdate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function patientAddressText(patient: Patient) {
  return [
    patient.address,
    patient.city,
    patient.state,
    patient.postal_code,
    patient.country,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

function conditionText(patient: Patient) {
  return patient.chronic_conditions?.trim() || "—";
}

function getInitial(patient: Patient) {
  return patient.full_name?.trim()?.charAt(0)?.toUpperCase() || "P";
}

export function EmrListClient({
  clinicId,
  currentUserId,
  clinicName,
  initialQuery,
  initialFilter,
  patients,
  latestVisit,
  latestVitalsVisit,
  patientVisits,
  patientSummaries,
  referralDoctors,
  error,
  counts,
}: Props) {
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "summary" | "visits" | "labs">(
    "overview",
  );
  const [quickAction, setQuickAction] = useState<QuickAction | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referringDoctorId, setReferringDoctorId] = useState(currentUserId);
  const [referredToDoctorId, setReferredToDoctorId] = useState("");
  const [referredToName, setReferredToName] = useState("");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [referralReason, setReferralReason] = useState("");
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSaved, setReferralSaved] = useState(false);

  function buildUrl(nextFilter: PatientFilter, nextQuery = query) {
    const params = new URLSearchParams();

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    if (nextFilter !== "all") {
      params.set("filter", nextFilter);
    }

    const search = params.toString();
    return search ? `/emr?${search}` : "/emr";
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildUrl(initialFilter, query));
  }

  function openPatientModal(patient: Patient) {
    setSelectedPatient(patient);
    setActiveTab("overview");
    setQuickAction(null);
  }

  function closePatientModal() {
    setSelectedPatient(null);
  }

  function openReferral() {
    setReferringDoctorId(currentUserId);
    setReferredToDoctorId("");
    setReferredToName("");
    setSpecialty("Cardiology");
    setReferralReason("");
    setReferralError(null);
    setReferralSaved(false);
    setReferralOpen(true);
  }

  async function sendReferral() {
    if (!selectedPatient) return;

    setReferralError(null);
    setReferralSaved(false);

    const referredDoctor = referralDoctors.find((doctor) => doctor.id === referredToDoctorId);
    const referredName = referredDoctor?.full_name || referredToName.trim();

    if (!referringDoctorId || !referredToDoctorId || !referredName || !specialty || !referralReason.trim()) {
      setReferralError("Please complete all required fields.");
      return;
    }

    setReferralBusy(true);
    const { error } = await supabaseBrowser()
      .from("referrals")
      .insert({
        clinic_id: clinicId,
        patient_id: selectedPatient.id,
        referring_doctor_id: referringDoctorId,
        referred_to_doctor_id: referredToDoctorId,
        referred_to_name: referredName,
        referred_to_specialty: specialty,
        reason: referralReason.trim(),
        status: "sent",
        created_by: currentUserId,
      });
    setReferralBusy(false);

    if (error) {
      setReferralError(error.message);
      return;
    }

    setReferralSaved(true);
    setReferredToDoctorId("");
    setReferredToName("");
    setReferralReason("");
  }

  const tabs: Array<{
    key: PatientFilter;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All", count: counts.all },
    { key: "today", label: "Today Visited", count: counts.today },
    { key: "chronic", label: "Chronic Diseases", count: counts.chronic },
  ];

  return (
    <>
      <div className="premium-shell">
        <div className="dashboard-hero mb-0 flex flex-col gap-5 rounded-[24px] p-6 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0ea5a4]">
              Patient Directory
            </p>
            <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-[#0f172a] dark:text-ink-100">
              {clinicName}
            </h1>
            <p className="mt-2 text-sm font-medium text-[#64748b] dark:text-ink-400">
              Search, review, and open patient records from one clinic-wide list.
            </p>
          </div>

          <Link
            href="/emr/intake"
            className="btn-teal self-start lg:self-auto"
          >
            + New Patient
          </Link>
        </div>

        <div className="premium-toolbar">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => router.push(buildUrl(tab.key))}
                className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition ${
                  initialFilter === tab.key
                    ? "bg-[#0ea5a4] text-white"
                    : "bg-white text-[#64748b] ring-1 ring-black/[0.05] hover:text-[#0f172a]"
                }`}
              >
                {tab.label}
                <span className="ml-2 text-[11px] opacity-80">{tab.count}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSearch} className="w-full lg:w-[320px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient or EMR ID..."
              className="input-base h-11"
            />
          </form>
        </div>

        {error ? (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="premium-panel overflow-hidden">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>EMR ID</th>
                <th>Age/Sex</th>
                <th>Blood</th>
                <th>Condition</th>
                <th>Last Visit</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm font-semibold text-[#64748b]"
                  >
                    No patients found.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  const latest = latestVisit[patient.id];

                  return (
                    <tr key={patient.id}>
                      <td className="align-top">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-xs font-bold text-white">
                            {getInitial(patient)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-extrabold text-[#0f172a]">
                              {patient.full_name}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-[#64748b]">
                              {patient.phone || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="align-top font-mono text-[12px] text-[#64748b]">
                        {patient.emr_number || "—"}
                      </td>

                      <td className="align-top text-[#334155]">
                        {ageSex(patient)}
                      </td>

                      <td className="align-top text-[#334155]">
                        {patient.blood_group || "—"}
                      </td>

                      <td className="align-top">
                        {conditionText(patient) === "—" ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                            {conditionText(patient)}
                          </span>
                        )}
                      </td>

                      <td className="align-top text-[#334155]">
                        {formatDate(latest?.visit_date || patient.last_visit_at)}
                      </td>

                      <td className="align-top text-right">
                        <button
                          type="button"
                          onClick={() => openPatientModal(patient)}
                          className="premium-action"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-8 backdrop-blur-sm">
          <div className="premium-panel flex max-h-[calc(100vh-4rem)] w-full max-w-[800px] flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                <span className="text-purple-700">♟</span>
                Patient Profile
              </h2>

              <button
                type="button"
                onClick={closePatientModal}
                className="text-xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-lime-200 text-[20px] font-extrabold text-slate-900">
                  {getInitial(selectedPatient)}
                </div>

                <div>
                  <h3 className="text-[18px] font-extrabold text-slate-900">
                    {selectedPatient.full_name}
                  </h3>

                  <p className="mt-2 text-[12px] font-medium text-slate-500">
                    {selectedPatient.emr_number || "—"} · {modalAgeSex(selectedPatient)}
                  </p>

                  <p className="mt-3 text-[12px] text-slate-500">
                    {selectedPatient.phone || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-7 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-3 text-[13px] font-extrabold ${
                      activeTab === "overview"
                        ? "bg-teal-50 text-[#0f8f83]"
                        : "text-slate-500"
                    }`}
                  >
                    Overview
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("visits")}
                    className={`px-4 py-3 text-[13px] font-medium ${
                      activeTab === "visits" ? "bg-teal-50 text-[#0f8f83]" : "text-slate-500"
                    }`}
                  >
                    Visits
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("summary")}
                    className={`px-4 py-3 text-[13px] font-medium ${
                      activeTab === "summary" ? "bg-teal-50 text-[#0f8f83]" : "text-slate-500"
                    }`}
                  >
                    AI Summary
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("labs")}
                    className={`px-4 py-3 text-[13px] font-medium ${
                      activeTab === "labs" ? "bg-teal-50 text-[#0f8f83]" : "text-slate-500"
                    }`}
                  >
                    Labs
                  </button>

                </div>
              </div>

              {activeTab === "overview" ? (
                <div className="mt-5 grid grid-cols-1 gap-x-12 gap-y-4 text-[13px] sm:grid-cols-2">
                  <ProfileField label="First Name" value={selectedPatient.first_name || "â€”"} />
                  <ProfileField label="Last Name" value={selectedPatient.last_name || "â€”"} />
                  <ProfileField label="Birthdate" value={formatPatientBirthdate(selectedPatient.birthdate)} />
                  <ProfileField
                    label="Height"
                    value={selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : "â€”"}
                  />
                  <ProfileField label="Phone" value={selectedPatient.phone || "â€”"} />
                  <ProfileField label="Email" value={selectedPatient.email || "â€”"} />
                  <ProfileField
                    label="Emergency Contact"
                    value={selectedPatient.emergency_contact || "â€”"}
                  />
                  <ProfileField label="Address" value={patientAddressText(selectedPatient)} />
                  <ProfileField label="ABHA ID" value={selectedPatient.abha_id || "â€”"} />
                  <ProfileField
                    label="ABHA Address"
                    value={selectedPatient.abha_address || "â€”"}
                  />
                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Blood Group</p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {selectedPatient.blood_group || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Allergies</p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {selectedPatient.known_allergies || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-medium text-slate-500">
                      Chronic Conditions
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {selectedPatient.chronic_conditions || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Total Visits</p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {latestVisit[selectedPatient.id] ? "1" : "0"}
                    </p>
                  </div>
                </div>
              ) : activeTab === "summary" ? (
                <PatientSummaryPanel
                  patient={selectedPatient}
                  summaries={patientSummaries[selectedPatient.id] || []}
                />
              ) : activeTab === "visits" ? (
                <PatientVisitsPanel visits={patientVisits[selectedPatient.id] || []} />
              ) : activeTab === "labs" ? (
                <PatientLabsPanel visits={patientVisits[selectedPatient.id] || []} />
              ) : (
                <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-semibold text-slate-500">
                  No {activeTab} data available here.
                </div>
              )}

              {quickAction ? (
                <QuickActionPanel
                  action={quickAction}
                  latest={
                    quickAction === "vitals"
                      ? latestVitalsVisit[selectedPatient.id]
                      : latestVisit[selectedPatient.id]
                  }
                  patient={selectedPatient}
                />
              ) : null}

              <div className="mt-5">
                <p className="mb-3 text-[12px] font-extrabold text-slate-700">
                  Quick Actions
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAction("vitals")}
                    className="premium-action"
                  >
                    📈 Vitals
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickAction("prescribe")}
                    className="premium-action"
                  >
                    💊 Prescribe
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickAction("carePlan")}
                    className="premium-action"
                  >
                    📌 Care Plan
                  </button>

                  <button
                    type="button"
                    onClick={openReferral}
                    className="premium-action"
                  >
                    🔗 Refer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPatient && referralOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/60 px-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-deep">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-[18px] font-extrabold text-slate-900">
                Refer {selectedPatient.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setReferralOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close referral"
              >
                x
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-slate-500">
                  Referring Doctor
                </span>
                <select
                  value={referringDoctorId}
                  onChange={(event) => setReferringDoctorId(event.target.value)}
                  className="input-base h-11"
                >
                  {referralDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-slate-500">
                  Referred To Doctor
                </span>
                <select
                  value={referredToDoctorId}
                  onChange={(event) => {
                    const doctorId = event.target.value;
                    const doctor = referralDoctors.find((item) => item.id === doctorId);
                    setReferredToDoctorId(doctorId);
                    setReferredToName(doctor?.full_name || "");
                  }}
                  className="input-base h-11"
                >
                  <option value="">Select doctor...</option>
                  {referralDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-slate-500">
                  Specialty
                </span>
                <select
                  value={specialty}
                  onChange={(event) => setSpecialty(event.target.value)}
                  className="input-base h-11"
                >
                  {[
                    "Cardiology",
                    "Dermatology",
                    "Endocrinology",
                    "ENT",
                    "Gastroenterology",
                    "Neurology",
                    "Obstetrics & Gynecology",
                    "Ophthalmology",
                    "Orthopedics",
                    "Pediatrics",
                    "Psychiatry",
                    "Pulmonology",
                    "Radiology",
                    "Urology",
                  ].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-slate-500">
                  Reason for Referral
                </span>
                <textarea
                  value={referralReason}
                  onChange={(event) => setReferralReason(event.target.value)}
                  className="input-base min-h-[92px] resize-y"
                />
              </label>

              {referralError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {referralError}
                </div>
              ) : null}
              {referralSaved ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  Referral sent and saved.
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setReferralOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendReferral}
                disabled={referralBusy}
                className="btn-teal disabled:opacity-50"
              >
                {referralBusy ? "Sending..." : "Send Referral"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function QuickActionPanel({
  action,
  latest,
  patient,
}: {
  action: QuickAction;
  latest: LatestVisit | undefined;
  patient: Patient;
}) {
  const title: Record<QuickAction, string> = {
    vitals: "Vitals",
    labs: "Lab Orders",
    prescribe: "Prescription",
    carePlan: "Care Plan",
  };

  return (
    <div className="mt-5 rounded border border-teal-100 bg-teal-50/50 px-4 py-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#0f8f83]">
            {title[action]}
          </p>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            {latest
              ? `Latest visit: ${formatDate(latest.visit_date)}`
              : `No visit data recorded yet for ${patient.full_name}.`}
          </p>
        </div>
        {latest ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-teal-100">
            {latest.status}
          </span>
        ) : null}
      </div>

      {!latest ? (
        <EmptyActionState label={title[action]} />
      ) : action === "vitals" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="BP" value={formatBp(latest)} />
          <Metric label="Pulse" value={valueWithUnit(latest.pulse, "bpm")} />
          <Metric label="Temp" value={valueWithUnit(latest.temperature_f, "°F")} />
          <Metric label="SpO2" value={valueWithUnit(latest.spo2, "%")} />
          <Metric label="Weight" value={valueWithUnit(latest.weight_kg, "kg")} />
          <Metric label="Height" value={valueWithUnit(patient.height_cm, "cm")} />
          <div className="sm:col-span-2">
            <Metric label="Chief complaint" value={latest.chief_complaints || "-"} />
          </div>
        </div>
      ) : action === "labs" ? (
        latest.investigations_ordered ? (
          <div className="whitespace-pre-wrap rounded bg-white px-4 py-3 text-[13px] font-semibold leading-relaxed text-slate-800 ring-1 ring-teal-100">
            {latest.investigations_ordered}
          </div>
        ) : (
          <EmptyActionState label="lab orders" />
        )
      ) : action === "prescribe" ? (
        latest.prescription?.medicines?.length ? (
          <div className="space-y-2">
            {latest.prescription.medicines.map((medicine, index) => (
              <div
                key={`${medicine.name}-${index}`}
                className="rounded bg-white px-4 py-3 text-[13px] ring-1 ring-teal-100"
              >
                <p className="font-extrabold text-slate-900">{medicine.name}</p>
                <p className="mt-1 text-slate-600">
                  {[medicine.dose, medicine.frequency, medicine.duration, medicine.route]
                    .filter(Boolean)
                    .join(" · ") || "-"}
                </p>
                {medicine.instructions ? (
                  <p className="mt-1 text-slate-500">{medicine.instructions}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyActionState label="prescription" />
        )
      ) : latest.advice || latest.follow_up_date || latest.follow_up_notes ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric label="Advice" value={latest.advice || "-"} />
          <Metric label="Follow-up date" value={latest.follow_up_date || "-"} />
          <div className="sm:col-span-2">
            <Metric label="Follow-up notes" value={latest.follow_up_notes || "-"} />
          </div>
        </div>
      ) : (
        <EmptyActionState label="care plan" />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white px-3 py-2 ring-1 ring-teal-100">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-[13px] font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyActionState({ label }: { label: string }) {
  return (
    <div className="rounded bg-white px-4 py-6 text-center text-[13px] font-semibold text-slate-500 ring-1 ring-teal-100">
      No {label} data available yet.
    </div>
  );
}

function formatBp(latest: LatestVisit) {
  if (latest.bp_systolic == null || latest.bp_diastolic == null) return "-";
  return `${latest.bp_systolic}/${latest.bp_diastolic} mmHg`;
}

function valueWithUnit(value: number | null | undefined, unit: string) {
  return value == null ? "-" : `${value} ${unit}`;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function PatientVisitsPanel({ visits }: { visits: PatientVisitItem[] }) {
  if (visits.length === 0) {
    return (
      <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-semibold text-slate-500">
        No visits data available here.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {visits.map((visit) => (
        <article
          key={visit.visit_id}
          className="rounded border border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[13px] font-extrabold text-slate-900">
                {formatDate(visit.visit_date)}
              </p>
              <p className="mt-1 text-[12px] font-medium text-slate-500">
                {visit.diagnosis || visit.chief_complaints || "No diagnosis recorded"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {visit.status}
              </span>
              {visit.has_vitals ? (
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-[#0f8f83] ring-1 ring-teal-100">
                  Vitals
                </span>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PatientLabsPanel({ visits }: { visits: PatientVisitItem[] }) {
  const labVisits = visits.filter((visit) => visit.investigations_ordered?.trim());

  if (labVisits.length === 0) {
    return (
      <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-semibold text-slate-500">
        No labs data available here.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {labVisits.map((visit) => (
        <article
          key={visit.visit_id}
          className="rounded border border-slate-200 bg-white px-4 py-3"
        >
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] font-extrabold text-slate-900">
              {formatDate(visit.visit_date)}
            </p>
            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {visit.status}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-slate-800">
            {visit.investigations_ordered}
          </div>
        </article>
      ))}
    </div>
  );
}

function PatientSummaryPanel({
  patient,
  summaries,
}: {
  patient: Patient;
  summaries: PatientSummary[];
}) {
  return (
    <div className="mt-5 rounded border border-violet-100 bg-violet-50/50 px-4 py-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-violet-700">
            AI Patient Summary
          </p>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            Showing summary only for {patient.full_name}.
          </p>
        </div>
        {summaries.length > 0 ? (
          <div className="text-left text-[11px] font-semibold text-slate-500 sm:text-right">
            {summaries.length} available
          </div>
        ) : null}
      </div>

      {summaries.length > 0 ? (
        <div className="space-y-3">
          {summaries.map((summary) => (
            <article
              key={summary.visit_id}
              className="rounded bg-white px-4 py-3 ring-1 ring-violet-100"
            >
              <div className="mb-2 flex flex-col gap-1 text-[11px] font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Visit: {formatDate(summary.visit_date)}</span>
                <span>Generated: {formatDate(summary.generated_at)}</span>
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                {summary.summary}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded bg-white px-4 py-6 text-center text-[13px] font-semibold text-slate-500 ring-1 ring-violet-100">
          No AI summary is available for this selected patient yet.
        </div>
      )}
    </div>
  );
}
