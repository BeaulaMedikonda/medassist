"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  MicIcon,
  BrainIcon,
  ClipboardIcon,
  ListCheckIcon,
  LinkIcon,
  SparkleIcon,
  BeakerIcon,
  MonitorIcon,
  EyeIcon,
  ChartBarIcon,
  PillIcon,
  LockIcon,
} from "@/components/dashboard/icons";

type Tone = "brand" | "violet" | "rose" | "amber" | "sky" | "accent" | "slate";

const toneIcon: Record<Tone, string> = {
  brand:  "bg-[#dbeafe] text-[#2563eb] dark:bg-brand-900/40 dark:text-brand-300",
  violet: "bg-[#ede9fe] text-[#7c3aed] dark:bg-violet-900/40 dark:text-violet-300",
  rose:   "bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-900/40 dark:text-rose-300",
  amber:  "bg-[#ffedd5] text-[#ea580c] dark:bg-amber-900/40 dark:text-amber-300",
  sky:    "bg-[#cffafe] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300",
  accent: "bg-[#ccfbef] text-[#0ea5a4] dark:bg-accent-900/40 dark:text-accent-300",
  slate:  "bg-[#eef2f7] text-[#475569] dark:bg-ink-800 dark:text-ink-300",
};

type Module = {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: Tone;
};

export type SummaryPatient = {
  id: string;
  full_name: string;
  emr_number: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  blood_group: string | null;
  known_allergies: string | null;
  chronic_conditions: string | null;
};

export type PatientSummary = {
  visit_id: string;
  patient_id: string;
  visit_date: string;
  status: string;
  summary: string;
  generated_at: string | null;
};

export type ReferralDoctor = {
  id: string;
  full_name: string;
};

const MODULES: Module[] = [
  { title: "Voice-to-Text Charting",   description: "Dictate clinical notes using voice transcription",        icon: <MicIcon />,       tone: "brand" },
  { title: "Clinical Decision Support", description: "Auto-alerts with evidence-based treatment suggestions",     icon: <BrainIcon />,     tone: "rose" },
  { title: "Care Plan Module",          description: "Create and manage patient care goals",                     icon: <ClipboardIcon />, tone: "rose" },
  { title: "Review of Systems (ROS)",   description: "Systematic checklist of all body systems",                 icon: <ListCheckIcon />, tone: "slate" },
  { title: "Referral Management",       description: "Track and manage patient referrals to specialists",        icon: <LinkIcon />,      tone: "sky" },
  { title: "Patient Summaries",         description: "Generate smart clinical summaries",                        icon: <SparkleIcon />,   tone: "violet" },
  { title: "Lab Orders & Results",      description: "Order lab tests and receive results electronically",       icon: <BeakerIcon />,    tone: "accent" },
  { title: "DICOM Image Viewer",        description: "View X-ray, MRI, CT scan images inside MedAssist",         icon: <MonitorIcon />,   tone: "sky" },
  { title: "Eye Exam Module",           description: "Comprehensive ophthalmic examination form",                icon: <EyeIcon />,       tone: "brand" },
  { title: "Track Anything",            description: "Graph-based form to track any custom patient data",        icon: <ChartBarIcon />,  tone: "amber" },
  { title: "WENO eRx",                  description: "Electronically send prescriptions to pharmacies",          icon: <PillIcon />,      tone: "rose" },
  { title: "Controlled Substance",      description: "Track and monitor controlled drug prescriptions",          icon: <LockIcon />,      tone: "slate" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClinicalModules({
  voiceToTextHref,
  summaryPatients = [],
  patientSummaries = [],
  currentUserId,
  referralDoctors = [],
}: {
  voiceToTextHref?: string;
  summaryPatients?: SummaryPatient[];
  patientSummaries?: PatientSummary[];
  clinicId: string;
  currentUserId: string;
  referralDoctors?: ReferralDoctor[];
}) {
  const router = useRouter();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [voiceStartOpen, setVoiceStartOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralPatientId, setReferralPatientId] = useState("");
  const [referringDoctorId, setReferringDoctorId] = useState(currentUserId);
  const [referredToDoctorId, setReferredToDoctorId] = useState("");
  const [referredToName, setReferredToName] = useState("");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [reason, setReason] = useState("");
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSaved, setReferralSaved] = useState(false);

  const selectedPatient = summaryPatients.find((patient) => patient.id === selectedPatientId) || null;
  const selectedSummaries = useMemo(
    () => patientSummaries.filter((summary) => summary.patient_id === selectedPatientId),
    [patientSummaries, selectedPatientId],
  );
  const latestSummary = selectedSummaries[0] || null;
  const activeVoiceHref = voiceToTextHref && voiceToTextHref !== "/emr" ? voiceToTextHref : null;

  async function copySummary() {
    if (!latestSummary) return;

    try {
      await navigator.clipboard.writeText(latestSummary.summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function sendReferral() {
    setReferralError(null);
    setReferralSaved(false);

    const referredDoctor = referralDoctors.find((doctor) => doctor.id === referredToDoctorId);
    const referredName = referredDoctor?.full_name || referredToName.trim();

    if (!referralPatientId || !referringDoctorId || !referredToDoctorId || !referredName || !specialty || !reason.trim()) {
      setReferralError("Please complete all required fields.");
      return;
    }

    setReferralBusy(true);
    const res = await fetch("/api/referrals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: referralPatientId,
        referringDoctorId,
        referredToDoctorId,
        referredToName: referredName,
        specialty,
        reason: reason.trim(),
      }),
    });
    const result = (await res.json().catch(() => ({}))) as { error?: string };
    setReferralBusy(false);

    if (!res.ok) {
      setReferralError(result.error || "Could not send referral.");
      return;
    }

    setReferralSaved(true);
    setReferredToDoctorId("");
    setReferredToName("");
    setReason("");
    router.refresh();
    window.setTimeout(() => {
      setReferralOpen(false);
    }, 1200);
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
        <span className="text-[#0ea5a4]">🩺</span>
        Clinical Modules
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => {
          const isVoiceCharting = m.title === "Voice-to-Text Charting";
          const isPatientSummaries = m.title === "Patient Summaries";
          const isReferralManagement = m.title === "Referral Management";
          const className = "premium-module-card group";
          const actionClassName = cn(
            className,
            "w-full cursor-pointer text-left focus-visible:ring-4 focus-visible:ring-[#0ea5a4]/20",
          );
          const card = (
            <>
              <div className="flex items-start justify-between">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneIcon[m.tone])}>
                  {m.icon}
                </div>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-[#0f172a] dark:text-ink-100">
                {m.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#64748b] dark:text-ink-500">
                {m.description}
              </p>
              {(isVoiceCharting || isReferralManagement || isPatientSummaries) ? (
                <span className="mt-4 inline-flex text-[12px] font-extrabold text-[#0f8f83] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Open
                </span>
              ) : null}
            </>
          );

          return isVoiceCharting && activeVoiceHref ? (
            <Link key={m.title} href={activeVoiceHref} className={className}>
              {card}
            </Link>
          ) : isVoiceCharting ? (
            <button
              key={m.title}
              type="button"
              onClick={() => setVoiceStartOpen(true)}
              className={actionClassName}
            >
              {card}
            </button>
          ) : isReferralManagement ? (
            <button
              key={m.title}
              type="button"
              onClick={() => {
                setReferralOpen(true);
                setReferralError(null);
                setReferralSaved(false);
                setReferredToDoctorId("");
                setReferredToName("");
              }}
              className={actionClassName}
            >
              {card}
            </button>
          ) : isPatientSummaries ? (
            <button
              key={m.title}
              type="button"
              onClick={() => setSummaryOpen(true)}
              className={actionClassName}
            >
              {card}
            </button>
          ) : (
            <div key={m.title} title="Coming soon" className={className}>
              {card}
            </div>
          );
        })}
      </div>

      {voiceStartOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-deep">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="flex items-center gap-2 text-[18px] font-extrabold text-[#0f172a]">
                <MicIcon />
                Start Voice Charting
              </h3>
              <button
                type="button"
                onClick={() => setVoiceStartOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close voice charting options"
              >
                x
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                No active patient is waiting for voice charting. Select an existing patient or create a new EMR to start a visit.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/emr"
                  onClick={() => setVoiceStartOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <div className="text-sm font-extrabold text-slate-950">
                    Search Patient
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-slate-500">
                    Find an existing EMR and start a visit.
                  </div>
                </Link>

                <Link
                  href="/emr/new"
                  onClick={() => setVoiceStartOpen(false)}
                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-left transition hover:border-cyan-400 hover:bg-cyan-100"
                >
                  <div className="text-sm font-extrabold text-cyan-900">
                    New EMR
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-cyan-800/80">
                    Register a patient and create a visit.
                  </div>
                </Link>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setVoiceStartOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {referralOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-deep">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="flex items-center gap-2 text-[18px] font-extrabold text-[#0f172a]">
                <LinkIcon />
                Referral Management
              </h3>
              <button
                type="button"
                onClick={() => setReferralOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close referral management"
              >
                x
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
                  Patient
                </span>
                <select
                  value={referralPatientId}
                  onChange={(event) => setReferralPatientId(event.target.value)}
                  className="input-base h-11"
                >
                  <option value="">Select patient...</option>
                  {summaryPatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} ({patient.emr_number})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
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
                <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
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
                <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
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
                <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
                  Reason for Referral
                </span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
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

      {summaryOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-deep">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="flex items-center gap-2 text-[18px] font-extrabold text-[#0f172a]">
                <SparkleIcon />
                AI-Powered Patient Summary
              </h3>
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close patient summary"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <label className="block">
                <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
                  Patient
                </span>
                <select
                  value={selectedPatientId}
                  onChange={(event) => {
                    setSelectedPatientId(event.target.value);
                    setCopied(false);
                  }}
                  className="input-base h-11"
                >
                  <option value="">Select patient...</option>
                  {summaryPatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} ({patient.emr_number})
                    </option>
                  ))}
                </select>
              </label>

              {!selectedPatient ? (
                <p className="text-sm font-medium text-[#64748b]">
                  Select a patient to view their AI summary.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] sm:grid-cols-2">
                    <SummaryDetail label="Patient" value={selectedPatient.full_name} />
                    <SummaryDetail label="EMR ID" value={selectedPatient.emr_number} />
                    <SummaryDetail
                      label="Age / Sex"
                      value={[
                        selectedPatient.age != null ? `${selectedPatient.age}y` : null,
                        selectedPatient.sex,
                      ].filter(Boolean).join(" / ") || "-"}
                    />
                    <SummaryDetail label="Phone" value={selectedPatient.phone || "-"} />
                    <SummaryDetail label="Blood Group" value={selectedPatient.blood_group || "-"} />
                    <SummaryDetail label="Allergies" value={selectedPatient.known_allergies || "-"} />
                    <div className="sm:col-span-2">
                      <SummaryDetail
                        label="Chronic Conditions"
                        value={selectedPatient.chronic_conditions || "-"}
                      />
                    </div>
                  </div>

                  {selectedSummaries.length > 0 ? (
                    <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                      {selectedSummaries.map((summary) => (
                        <article
                          key={summary.visit_id}
                          className="rounded-xl border border-violet-100 bg-violet-50/50 p-4"
                        >
                          <div className="mb-2 flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-violet-700 sm:flex-row sm:items-center sm:justify-between">
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
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                      No AI summary is available for this patient yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={copySummary}
                disabled={!latestSummary}
                className="btn-secondary disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              {selectedPatient ? (
                <Link href={`/emr/${selectedPatient.id}`} className="btn-teal">
                  Add to EMR
                </Link>
              ) : (
                <button type="button" disabled className="btn-teal opacity-50">
                  Add to EMR
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}
