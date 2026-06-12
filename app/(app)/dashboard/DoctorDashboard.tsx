"use client";
 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  UsersIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
} from "@/components/dashboard/icons";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { ClinicalModules } from "@/components/dashboard/ClinicalModules";
import { initials } from "@/lib/dashboard-utils";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { Clinic, Doctor, Patient, Referral, Visit } from "@/types/db";
 
type DashboardTone = "brand" | "amber" | "sky" | "violet" | "rose" | "slate" | "accent";
type DashboardSection =
  | "todayIntake"
  | "completedPatients"
  | "sendReferral"
  | "sentReferrals"
  | "receivedReferrals";
type DashboardPreVisitSummary = {
  visit_id: string;
  patient_id: string;
  visit_date: string;
  status: string;
  summary: string;
  generated_at: string | null;
};
 
const dashboardToneCard: Record<DashboardTone, string> = {
  brand: "bg-gradient-to-br from-[#eef5ff] to-white dark:from-brand-900/20 dark:to-ink-900",
  accent: "bg-gradient-to-br from-[#ecfdf7] to-white dark:from-accent-900/20 dark:to-ink-900",
  amber: "bg-gradient-to-br from-[#fff6ec] to-white dark:from-amber-900/20 dark:to-ink-900",
  sky: "bg-gradient-to-br from-[#ecfeff] to-white dark:from-sky-900/20 dark:to-ink-900",
  violet: "bg-gradient-to-br from-[#f5f2ff] to-white dark:from-violet-900/20 dark:to-ink-900",
  rose: "bg-gradient-to-br from-[#fff1f3] to-white dark:from-rose-900/20 dark:to-ink-900",
  slate: "bg-gradient-to-br from-[#f7f9fc] to-white dark:from-ink-800/40 dark:to-ink-900",
};
 
const dashboardToneIcon: Record<DashboardTone, string> = {
  brand: "bg-[#dbeafe] text-[#2563eb] dark:bg-brand-900/40 dark:text-brand-300",
  accent: "bg-[#ccfbef] text-[#0ea5a4] dark:bg-accent-900/40 dark:text-accent-300",
  amber: "bg-[#ffedd5] text-[#ea580c] dark:bg-amber-900/40 dark:text-amber-300",
  sky: "bg-[#cffafe] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300",
  violet: "bg-[#ede9fe] text-[#7c3aed] dark:bg-violet-900/40 dark:text-violet-300",
  rose: "bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-900/40 dark:text-rose-300",
  slate: "bg-[#eef2f7] text-[#475569] dark:bg-ink-800 dark:text-ink-300",
};
 
const dashboardToneGlow: Record<DashboardTone, string> = {
  brand: "bg-[#93c5fd] dark:bg-brand-700",
  accent: "bg-[#5eead4] dark:bg-accent-700",
  amber: "bg-[#fdba74] dark:bg-amber-700",
  sky: "bg-[#67e8f9] dark:bg-sky-700",
  violet: "bg-[#c4b5fd] dark:bg-violet-700",
  rose: "bg-[#fda4af] dark:bg-rose-700",
  slate: "bg-[#cbd5e1] dark:bg-ink-700",
};
 
const dashboardToneValue: Record<DashboardTone, string> = {
  brand: "text-[#2563eb] dark:text-brand-400",
  accent: "text-[#0ea5a4] dark:text-accent-400",
  amber: "text-[#ea580c] dark:text-amber-400",
  sky: "text-[#0891b2] dark:text-sky-400",
  violet: "text-[#7c3aed] dark:text-violet-400",
  rose: "text-[#e11d48] dark:text-rose-400",
  slate: "text-[#334155] dark:text-ink-200",
};
 
const dashboardSectionConfig: Record<
  DashboardSection,
  { label: string; hint: string; empty: string; tone: DashboardTone }
> = {
  todayIntake: {
    label: "Today's Intake Queue",
    hint: "patients checked in",
    empty: "No patients are in today's intake queue.",
    tone: "brand",
  },
  completedPatients: {
    label: "Completed Patients",
    hint: "completed visits",
    empty: "No completed patients yet.",
    tone: "accent",
  },
  sentReferrals: {
    label: "Referrals Sent",
    hint: "patients referred out",
    empty: "No referrals sent yet.",
    tone: "sky",
  },
  sendReferral: {
    label: "Send Referral",
    hint: "refer a patient",
    empty: "Select a patient and referred doctor to send a referral.",
    tone: "sky",
  },
  receivedReferrals: {
    label: "Referrals Received",
    hint: "patients referred in",
    empty: "No referrals received yet.",
    tone: "amber",
  },
};
 
export function DoctorDashboard({
  member,
  clinic,
  myToday,
  myQueue,
  patientById,
  summaryPatients,
  patientSummaries,
  receivedReferrals,
  sentReferrals,
  initialSection = null,
  doctorRoster,
}: {
  member: Doctor;
  clinic: Clinic;
  myToday: Visit[];
  myQueue: Visit[];
  patientById: Record<string, Patient>;
  summaryPatients: Patient[];
  patientSummaries: Array<{
    id: string;
    patient_id: string;
    visit_date: string;
    status: string;
    pre_visit_summary: string | null;
    pre_visit_summary_generated_at: string | null;
  }>;
  receivedReferrals: Referral[];
  sentReferrals: Referral[];
  initialSection?: DashboardSection | null;
  doctorRoster: Array<Pick<Doctor, "id" | "full_name">>;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<DashboardSection | null>(initialSection);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(() => {
    if (initialSection === "sentReferrals") return sentReferrals[0]?.id ?? null;
    if (initialSection === "receivedReferrals") return receivedReferrals[0]?.id ?? null;
    return null;
  });
 
  const queueRows = myQueue
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.id === v.id) === i &&
        ["intake", "queued", "in_progress", "awaiting_review"].includes(v.status),
    )
    .slice(0, 12);
  const completedRows = myToday
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.id === v.id) === i &&
        v.status === "completed",
    )
    .slice(0, 8);
  const voiceChartingVisit = pickVoiceChartingVisit(queueRows);
  const voiceChartingPatient = voiceChartingVisit
    ? patientById[voiceChartingVisit.patient_id]
    : null;
  const voiceToTextHref =
    voiceChartingVisit && voiceChartingPatient
      ? `/emr/${voiceChartingPatient.id}/visits/new?vid=${voiceChartingVisit.id}&mode=record`
      : "/emr";
  const activeConfig = activeSection ? dashboardSectionConfig[activeSection] : null;
  const activeVisitRows =
    activeSection === "todayIntake"
      ? queueRows
      : activeSection === "completedPatients"
        ? completedRows
        : [];
  const activeReferralRows =
    activeSection === "sentReferrals"
      ? sentReferrals
      : activeSection === "receivedReferrals"
        ? receivedReferrals
        : [];
  const selectedReferral =
    activeReferralRows.find((referral) => referral.id === selectedReferralId) || null;
  const selectedReferralPatient = selectedReferral ? patientById[selectedReferral.patient_id] : null;
  const dashboardPreVisitSummaries = patientSummaries
    .map((summary) => {
      const text = summary.pre_visit_summary?.trim();
      if (!text) return null;
 
      return {
        visit_id: summary.id,
        patient_id: summary.patient_id,
        visit_date: summary.visit_date,
        status: summary.status,
        summary: text,
        generated_at: summary.pre_visit_summary_generated_at,
      };
    })
    .filter((summary): summary is DashboardPreVisitSummary => Boolean(summary));
 
  useEffect(() => {
    const channel = supabaseBrowser()
      .channel(`doctor-referrals-${member.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
          filter: `clinic_id=eq.${clinic.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();
 
    return () => {
      void supabaseBrowser().removeChannel(channel);
    };
  }, [clinic.id, member.id, router]);
 
  useEffect(() => {
    setActiveSection(initialSection);
    if (initialSection === "sentReferrals") {
      setSelectedReferralId(sentReferrals[0]?.id ?? null);
    } else if (initialSection === "receivedReferrals") {
      setSelectedReferralId(receivedReferrals[0]?.id ?? null);
    } else {
      setSelectedReferralId(null);
    }
  }, [initialSection, receivedReferrals, sentReferrals]);
 
  function toggleSection(section: DashboardSection, referralId: string | null = null) {
    if (activeSection === section) {
      setActiveSection(null);
      setSelectedReferralId(null);
      return;
    }
 
    setActiveSection(section);
    setSelectedReferralId(referralId);
  }
 
  return (
    <div className="premium-shell">
      <DashboardHero
        name={member.full_name}
        clinicName={clinic.name}
        honorific
        waveEmoji
      />
 
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-4">
        <DashboardStatButton
          label="Today's Queue"
          value={queueRows.length}
          hint="patients checked in"
          icon={<UsersIcon />}
          tone="brand"
          active={activeSection === "todayIntake"}
          href={dashboardSectionHref("todayIntake", activeSection)}
        />
        <DashboardStatButton
          label="Completed Patients"
          value={completedRows.length}
          hint="completed visits"
          icon={<CheckCircleIcon />}
          tone="accent"
          active={activeSection === "completedPatients"}
          href={dashboardSectionHref("completedPatients", activeSection)}
        />
        <DashboardStatButton
          label="Sent Referrals"
          value={sentReferrals.length}
          hint="patients referred out"
          icon={<ClockIcon />}
          tone="sky"
          active={activeSection === "sentReferrals"}
          href={dashboardSectionHref("sentReferrals", activeSection)}
        />
        <DashboardStatButton
          label="Referral Received"
          value={receivedReferrals.length}
          hint="patients referred in"
          icon={<ClipboardIcon />}
          tone="amber"
          active={activeSection === "receivedReferrals"}
          href={dashboardSectionHref("receivedReferrals", activeSection)}
        />
      </section>
 
      {activeSection && activeConfig ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeading label={activeConfig.label} flush />
          </div>
          {activeSection === "sendReferral" ? (
            <SendReferralPanel
              currentUserId={member.id}
              summaryPatients={summaryPatients}
              referralDoctors={doctorRoster.length > 0 ? doctorRoster : [{ id: member.id, full_name: member.full_name }]}
              onSent={() => router.refresh()}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-white p-0 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800 dark:bg-ink-900">
                {activeSection === "todayIntake" || activeSection === "completedPatients" ? (
                  activeVisitRows.length === 0 ? (
                    <EmptyDashboardCard message={activeConfig.empty} />
                  ) : (
                    <VisitQueueTable
                      visits={activeVisitRows}
                      patientById={patientById}
                    />
                  )
                ) : activeReferralRows.length === 0 ? (
                  <EmptyDashboardCard message={activeConfig.empty} />
                ) : (
                  <ReferralQueueTable
                    referrals={activeReferralRows}
                    patientById={patientById}
                    direction={activeSection === "sentReferrals" ? "sent" : "received"}
                    doctorRoster={doctorRoster}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}
 
      <ClinicalModules
        voiceToTextHref={voiceToTextHref}
        clinicId={clinic.id}
        currentUserId={member.id}
        referralDoctors={doctorRoster.length > 0 ? doctorRoster : [{ id: member.id, full_name: member.full_name }]}
        summaryPatients={summaryPatients.map((patient) => ({
          id: patient.id,
          full_name: patient.full_name,
          emr_number: patient.emr_number,
          age: patient.age,
          sex: patient.sex,
          phone: patient.phone,
          blood_group: patient.blood_group,
          known_allergies: patient.known_allergies,
          chronic_conditions: patient.chronic_conditions,
        }))}
        patientSummaries={patientSummaries
          .map((summary) => {
            const text = summary.pre_visit_summary?.trim();
            if (!text) return null;
 
            return {
              visit_id: summary.id,
              patient_id: summary.patient_id,
              visit_date: summary.visit_date,
              status: summary.status,
              summary: text,
              generated_at: summary.pre_visit_summary_generated_at,
            };
          })
          .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary))}
      />
    </div>
  );
}
 
function dashboardSectionHref(section: DashboardSection, activeSection: DashboardSection | null) {
  return activeSection === section ? "/dashboard" : `/dashboard?section=${section}`;
}
 
function SendReferralPanel({
  currentUserId,
  summaryPatients,
  referralDoctors,
  onSent,
}: {
  currentUserId: string;
  summaryPatients: Patient[];
  referralDoctors: Array<Pick<Doctor, "id" | "full_name">>;
  onSent: () => void;
}) {
  const [patientId, setPatientId] = useState("");
  const [referredToDoctorId, setReferredToDoctorId] = useState("");
  const [referredToName, setReferredToName] = useState("");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
 
  const currentDoctor = referralDoctors.find((doctor) => doctor.id === currentUserId) || null;
  const currentDoctorName = currentDoctor?.full_name.trim().toLowerCase() || "";
  const referredToDoctors = referralDoctors.filter(
    (doctor) =>
      doctor.id !== currentUserId &&
      doctor.full_name.trim().toLowerCase() !== currentDoctorName,
  );
 
  async function sendReferral() {
    setError(null);
    setSaved(false);
 
    const referredDoctor = referralDoctors.find((doctor) => doctor.id === referredToDoctorId);
    const referredName = referredDoctor?.full_name || referredToName.trim();
 
    if (!patientId || !referredToDoctorId || !referredName || !specialty || !reason.trim()) {
      setError("Please complete all required fields.");
      return;
    }
 
    if (
      referredToDoctorId === currentUserId ||
      referredName.trim().toLowerCase() === currentDoctorName
    ) {
      setError("Referring and referred doctors must be different.");
      return;
    }
 
    setBusy(true);
    const res = await fetch("/api/referrals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        referringDoctorId: currentUserId,
        referredToDoctorId,
        referredToName: referredName,
        specialty,
        reason: reason.trim(),
      }),
    });
    const result = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
 
    if (!res.ok) {
      setError(result.error || "Could not send referral.");
      return;
    }
 
    setSaved(true);
    setPatientId("");
    setReferredToDoctorId("");
    setReferredToName("");
    setReason("");
    onSent();
  }
 
  return (
    <div className="rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800 dark:bg-ink-900">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
            Patient
          </span>
          <select
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
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
            value={currentUserId}
            onChange={() => undefined}
            disabled
            className="input-base h-11 bg-slate-50 text-slate-600"
          >
            <option value={currentUserId}>
              {currentDoctor?.full_name || "Current doctor"}
            </option>
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
              const doctor = referredToDoctors.find((item) => item.id === doctorId);
              setReferredToDoctorId(doctorId);
              setReferredToName(doctor?.full_name || "");
            }}
            className="input-base h-11"
          >
            <option value="">Select doctor...</option>
            {referredToDoctors.map((doctor) => (
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
 
        <label className="block lg:col-span-2">
          <span className="mb-2 block text-[13px] font-extrabold text-[#64748b]">
            Reason for Referral
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="input-base min-h-[118px] resize-y"
          />
        </label>
      </div>
 
      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          Referral sent and saved.
        </div>
      ) : null}
 
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={sendReferral}
          disabled={busy}
          className="btn-teal disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send Referral"}
        </button>
      </div>
    </div>
  );
}
 
function DashboardStatButton({
  label,
  value,
  hint,
  icon,
  tone,
  active,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone: DashboardTone;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "block",
        "group relative overflow-hidden rounded-[18px] p-5 text-left transition-all duration-200",
        "border border-[rgba(15,23,42,0.06)] dark:border-ink-800/70",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)]",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,0.16)]",
        "focus:outline-none focus:ring-2 focus:ring-[#0ea5a4]/30",
        active ? "ring-2 ring-[#0ea5a4]/30" : "",
        dashboardToneCard[tone],
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-60",
          dashboardToneGlow[tone],
        )}
      />
 
      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            dashboardToneIcon[tone],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-[2rem] font-bold leading-none tracking-tight", dashboardToneValue[tone])}>
            {value}
          </div>
          <div className="mt-2 text-sm font-semibold text-[#0f172a] dark:text-ink-200">
            {label}
          </div>
          <div className="mt-0.5 text-[11px] text-[#64748b] dark:text-ink-500">
            {hint}
          </div>
        </div>
      </div>
    </Link>
  );
}
 
function SectionHeading({
  label,
  eyebrow,
  tone = "brand",
  flush = false,
}: {
  label: string;
  eyebrow?: string;
  tone?: "brand" | "success";
  flush?: boolean;
}) {
  return (
    <div className={`${flush ? "" : "mb-3"} flex items-center justify-between`}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
        {eyebrow ? (
          <span className="text-[12px] font-extrabold uppercase tracking-wide text-[#0ea5a4]">
            {eyebrow}
          </span>
        ) : (
          <span
            className={`h-2 w-2 rounded-full ${
              tone === "success" ? "bg-emerald-500" : "bg-[#0ea5a4]"
            }`}
          />
        )}
        {label}
      </h2>
    </div>
  );
}
 
function VisitQueueTable({
  visits,
  patientById,
}: {
  visits: Visit[];
  patientById: Record<string, Patient>;
}) {
  return (
    <div className="overflow-hidden rounded-[26px] bg-white dark:bg-ink-900">
      <div className="grid grid-cols-[minmax(210px,1.35fr)_minmax(170px,1fr)_minmax(110px,0.7fr)_minmax(110px,0.7fr)_90px] bg-slate-50 px-5 py-4 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b] dark:bg-ink-950/50 dark:text-ink-500">
        <div>Patient</div>
        <div>EMR ID</div>
        <div>Vitals</div>
        <div>Status</div>
        <div className="text-right">Action</div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-ink-800">
        {visits.map((visit) => {
          const patient = patientById[visit.patient_id];
          if (!patient) return null;
          const actionLabel =
            visit.status === "completed"
              ? "View"
              : visit.status === "awaiting_review"
                ? "Review"
                : "Open";
 
          return (
            <div
              key={visit.id}
              className={cn(
                "grid grid-cols-[minmax(210px,1.35fr)_minmax(170px,1fr)_minmax(110px,0.7fr)_minmax(110px,0.7fr)_90px] items-center px-5 py-4 transition",
                "bg-white hover:bg-slate-50 dark:bg-ink-900 dark:hover:bg-ink-900/70",
              )}
            >
              <div>
                <PatientIdentity patient={patient} tone={visitTone(visit.status)} compact />
              </div>
              <div className="font-mono text-[12px] text-[#64748b] dark:text-ink-400">
                {patient.emr_number}
              </div>
              <div>
                <VitalsPill captured={hasVitals(visit)} short />
              </div>
              <div>
                <StatusPill status={visit.status} />
              </div>
              <div className="text-right">
                <Link
                  href={
                    visit.status === "completed"
                      ? `/emr/${patient.id}?source=dashboard&section=completedPatients`
                      : `/emr/${patient.id}/visits/${visit.id}/previsit?section=todayIntake`
                  }
                  className="rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-[#0f8f83] shadow-sm ring-1 ring-slate-200 transition hover:ring-[#99f6e4] focus:outline-none focus:ring-2 focus:ring-[#0ea5a4]/30"
                >
                  {actionLabel}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
function ReferralQueueTable({
  referrals,
  patientById,
  direction,
  doctorRoster,
}: {
  referrals: Referral[];
  patientById: Record<string, Patient>;
  direction: "sent" | "received";
  doctorRoster: Array<Pick<Doctor, "id" | "full_name">>;
}) {
  const doctorById = new Map(doctorRoster.map((doctor) => [doctor.id, doctor.full_name]));
 
  return (
    <div className="overflow-hidden rounded-[26px] bg-white dark:bg-ink-900">
      <div className="grid grid-cols-[minmax(230px,1.35fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_minmax(150px,1fr)_minmax(90px,0.6fr)_170px] bg-slate-50 px-5 py-4 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b] dark:bg-ink-950/50 dark:text-ink-500">
        <div>Patient</div>
        <div>{direction === "sent" ? "To" : "From"}</div>
        <div>Specialty</div>
        <div>Reason</div>
        <div>Status</div>
        <div className="text-right">Action</div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-ink-800">
        {referrals.map((referral) => {
          const patient = patientById[referral.patient_id];
          const tone = referralTone(referral.status);
 
          return (
            <div
              key={referral.id}
              className={cn(
                "grid grid-cols-[minmax(230px,1.35fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_minmax(150px,1fr)_minmax(90px,0.6fr)_170px] items-center px-5 py-4 transition",
                "bg-white hover:bg-slate-50 dark:bg-ink-900 dark:hover:bg-ink-900/70",
              )}
            >
              <div>
                {patient ? (
                  <PatientIdentity patient={patient} tone={tone} compact />
                ) : (
                  <div className="font-semibold text-[#64748b]">Patient unavailable</div>
                )}
              </div>
              <div className="text-sm font-semibold text-[#334155] dark:text-ink-300">
                {direction === "sent"
                  ? referral.referred_to_name || "-"
                  : doctorById.get(referral.referring_doctor_id) || "Clinic doctor"}
              </div>
              <div>
                <div className="text-sm font-semibold text-[#334155] dark:text-ink-300">
                  {referral.referred_to_specialty || "-"}
                </div>
                <div className="mt-1 text-[11px] font-medium text-[#64748b] dark:text-ink-500">
                  {formatDate(referral.created_at)}
                </div>
              </div>
              <div className="truncate pr-3 text-sm text-[#334155] dark:text-ink-300">
                {referral.reason || "-"}
              </div>
              <div>
                <ReferralStatusPill status={referral.status} />
              </div>
              <div className="flex justify-end gap-2">
                {patient ? (
                  <>
                    <Link
                      href={`/dashboard/referrals/${referral.id}`}
                      className="rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-[#334155] shadow-sm ring-1 ring-slate-200 transition hover:ring-[#99f6e4] focus:outline-none focus:ring-2 focus:ring-[#0ea5a4]/30 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/emr/${patient.id}?source=referral&section=${direction === "sent" ? "sentReferrals" : "receivedReferrals"}`}
                      className="rounded-full bg-white px-3 py-2 text-[12px] font-extrabold text-[#0f8f83] shadow-sm ring-1 ring-slate-200 transition hover:ring-[#99f6e4] focus:outline-none focus:ring-2 focus:ring-[#0ea5a4]/30 dark:bg-ink-900 dark:ring-ink-700"
                    >
                      EMR
                    </Link>
                  </>
                ) : (
                  <span className="text-[12px] font-semibold text-slate-400">Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
function ReferralListItem({
  referral,
  patient,
  selected,
  onClick,
}: {
  referral: Referral;
  patient: Patient | null;
  selected: boolean;
  onClick: () => void;
}) {
  const tone = referralTone(referral.status);
 
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-[16px] p-4 text-left transition-all duration-200",
        "border border-[rgba(15,23,42,0.06)] dark:border-ink-800/70",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)]",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,0.16)]",
        "focus:outline-none focus:ring-2 focus:ring-[#0ea5a4]/30",
        selected ? "ring-2 ring-[#0ea5a4]/30" : "",
        dashboardToneCard[tone],
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-60",
          dashboardToneGlow[tone],
        )}
      />
      <div className="relative grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          {patient ? (
            <PatientIdentity patient={patient} tone={tone} />
          ) : (
            <div className="font-semibold text-[#64748b]">Patient unavailable</div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <ReferralStatusPill status={referral.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {referral.referred_to_specialty}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#64748b] shadow-sm ring-1 ring-slate-200">
            View details
          </span>
        </div>
      </div>
    </button>
  );
}
 
function ReferralDetailPanel({
  referral,
  patient,
  direction,
  doctorRoster,
  summaries,
}: {
  referral: Referral | null;
  patient: Patient | null | undefined;
  direction: "sent" | "received";
  doctorRoster: Array<Pick<Doctor, "id" | "full_name">>;
  summaries: DashboardPreVisitSummary[];
}) {
  if (!referral) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-200 bg-gradient-to-br from-[#f7f9fc] to-white p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800 dark:from-ink-800/40 dark:to-ink-900">
        <div className="text-sm font-extrabold text-[#0f172a] dark:text-ink-100">
          Select a patient
        </div>
        <div className="mt-1 text-[13px] font-medium text-[#64748b] dark:text-ink-500">
          Referral details will appear here.
        </div>
      </div>
    );
  }
 
  const tone = referralTone(referral.status);
  const referringDoctor =
    doctorRoster.find((doctor) => doctor.id === referral.referring_doctor_id)?.full_name ||
    "Clinic doctor";
  const preVisitSummary = patient
    ? findPreVisitSummary(summaries, patient.id, referral.visit_id || undefined)
    : null;
 
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] p-5",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)]",
        dashboardToneCard[tone],
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl",
          dashboardToneGlow[tone],
        )}
      />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {patient ? (
            <PatientIdentity patient={patient} tone={tone} />
          ) : (
            <div className="font-semibold text-[#64748b]">Patient unavailable</div>
          )}
          <ReferralStatusPill status={referral.status} />
        </div>
 
        <div className="mt-5 grid gap-4 rounded-[14px] bg-white/70 p-4 backdrop-blur sm:grid-cols-2 dark:bg-ink-950/40">
          <DetailItem label={direction === "sent" ? "To" : "From"} value={direction === "sent" ? referral.referred_to_name : referringDoctor} />
          <DetailItem label="Specialty" value={referral.referred_to_specialty} />
          <DetailItem label="Date" value={formatDate(referral.created_at)} />
          <DetailItem label="Hospital" value={referral.referred_to_hospital || "-"} />
          <DetailItem label="Reason" value={referral.reason || "-"} wide />
          <DetailItem label="Notes" value={referral.notes || "-"} wide />
        </div>
 
        <PreVisitBrief summary={preVisitSummary} />
 
        <div className="mt-4 flex justify-end">
          {patient ? (
            <Link href={`/emr/${patient.id}`} className="premium-action">
              Open EMR
            </Link>
          ) : (
            <span className="text-[12px] font-semibold text-slate-400">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}
 
function PatientIdentity({
  patient,
  tone,
  compact = false,
}: {
  patient: Patient;
  tone: DashboardTone;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center text-[11px] font-bold",
          compact ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl",
          dashboardToneIcon[tone],
        )}
      >
        {initials(patient.full_name)}
      </span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#0f172a] dark:text-ink-100">
          {patient.full_name}
        </div>
        <div className="truncate text-[11px] text-[#64748b] dark:text-ink-500">
          {patient.age != null ? `${patient.age}${patient.sex || ""}` : "-"} | {patient.emr_number}
        </div>
      </div>
    </div>
  );
}
 
function PreVisitBrief({ summary }: { summary: DashboardPreVisitSummary | null }) {
  return (
    <div className="mt-5 rounded-[18px] border border-[#5eead4] bg-gradient-to-br from-[#ecfdf7] to-white p-5 dark:border-accent-800 dark:from-accent-900/20 dark:to-ink-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-extrabold text-[#0f172a] dark:text-ink-100">
            Pre-visit brief
          </div>
          <div className="mt-0.5 text-[12px] font-medium text-[#64748b] dark:text-ink-500">
            Vitals + recent visits across the clinic
          </div>
        </div>
        {summary?.generated_at ? (
          <div className="text-right text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Generated {formatDateTime(summary.generated_at)}
          </div>
        ) : null}
      </div>
 
      {summary ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#0f172a] dark:text-ink-100">
          {summary.summary}
        </div>
      ) : (
        <div className="mt-4 rounded-[14px] bg-white/70 p-4 text-sm font-medium text-[#64748b] dark:bg-ink-950/40 dark:text-ink-500">
          No pre-visit summary generated for this patient yet.
        </div>
      )}
    </div>
  );
}
 
function EmptyDashboardCard({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-200 bg-gradient-to-br from-[#f7f9fc] to-white px-5 py-10 text-center text-sm font-medium text-[#64748b] shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800 dark:from-ink-800/40 dark:to-ink-900 dark:text-ink-500 md:col-span-2 xl:col-span-3">
      {message}
    </div>
  );
}
 
function DetailItem({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
        {label}
      </div>
      <div
        className={`mt-1 break-words text-sm font-semibold text-[#0f172a] dark:text-ink-100 ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}
 
function VitalsPill({ captured, short = false }: { captured: boolean; short?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        captured
          ? "bg-[#ecfdf5] text-[#059669] dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-[#fff7ed] text-[#ea580c] dark:bg-amber-900/30 dark:text-amber-300"
      }`}
    >
      {captured ? (short ? "Captured" : "Vitals captured") : short ? "Pending" : "Vitals pending"}
    </span>
  );
}
 
function visitTone(status: Visit["status"]): DashboardTone {
  if (status === "queued") return "brand";
  if (status === "in_progress") return "sky";
  if (status === "completed") return "accent";
  if (status === "intake") return "amber";
  if (status === "awaiting_review") return "violet";
  if (status === "cancelled") return "rose";
  return "slate";
}
 
function referralTone(status: Referral["status"]): DashboardTone {
  if (status === "sent") return "sky";
  if (status === "accepted") return "violet";
  if (status === "completed") return "accent";
  if (status === "cancelled") return "rose";
  return "slate";
}
 
function ReferralStatusPill({ status }: { status: Referral["status"] }) {
  const map: Record<Referral["status"], { cls: string; label: string }> = {
    draft: { cls: "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400", label: "Draft" },
    sent: { cls: "bg-[#ecfeff] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300", label: "Sent" },
    accepted: { cls: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", label: "Accepted" },
    completed: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: "Completed" },
    cancelled: { cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", label: "Cancelled" },
  };
  const { cls, label } = map[status];
 
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
 
function pickVoiceChartingVisit(visits: Visit[]) {
  return (
    visits.find((v) => v.status === "queued" || v.status === "in_progress") ??
    visits.find((v) => v.status === "intake")
  );
}
 
function hasVitals(visit: Visit) {
  return Boolean(
    visit.bp_systolic ||
      visit.bp_diastolic ||
      visit.pulse ||
      visit.temperature_f ||
      visit.spo2 ||
      visit.weight_kg ||
      visit.height_cm,
  );
}
 
function findPreVisitSummary(
  summaries: DashboardPreVisitSummary[],
  patientId: string,
  visitId?: string,
) {
  return (
    (visitId ? summaries.find((summary) => summary.visit_id === visitId) : null) ||
    summaries
      .filter((summary) => summary.patient_id === patientId)
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0] ||
    null
  );
}
 
function StatusPill({ status }: { status: Visit["status"] }) {
  const map: Record<Visit["status"], { cls: string; label: string }> = {
    intake: { cls: "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400", label: "Intake" },
    queued: { cls: "bg-[#ecfeff] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300", label: "In Queue" },
    in_progress: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", label: "With Doctor" },
    awaiting_review: { cls: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", label: "Draft" },
    completed: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: "Done" },
    cancelled: { cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", label: "Cancelled" },
  };
  const { cls, label } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
 
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
 
function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
 
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
 
function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
 
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
 
 
