"use client";
 
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  UsersIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  PlusIcon,
} from "@/components/dashboard/icons";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { ClinicalModules } from "@/components/dashboard/ClinicalModules";
import { initials } from "@/lib/dashboard-utils";
import type { Clinic, Doctor, Patient, Referral, Visit } from "@/types/db";
 
export function DoctorDashboard({
  member,
  clinic,
  myToday,
  myAwaiting,
  clinicToday,
  clinicAwaiting,
  patientById,
  summaryPatients,
  patientSummaries,
  receivedReferrals,
  doctorRoster,
}: {
  member: Doctor;
  clinic: Clinic;
  myToday: Visit[];
  myAwaiting: Visit[];
  clinicToday: Visit[];
  clinicAwaiting: Visit[];
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
  doctorRoster: Array<Pick<Doctor, "id" | "full_name">>;
}) {
  const queuedCount = myToday.filter((v) => v.status === "queued").length;
  const withDoctorCount = myToday.filter((v) => v.status === "in_progress").length;
  const reviewedCount = myToday.filter((v) => v.status === "completed").length;
  const pendingIntakeCount = myToday.filter((v) => v.status === "intake").length;
 
  const queueRows = [...myAwaiting, ...myToday]
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.id === v.id) === i &&
        ["intake", "queued", "in_progress", "awaiting_review"].includes(v.status),
    )
    .slice(0, 12);
  const completedRows = [...myAwaiting, ...myToday]
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.id === v.id) === i &&
        v.status === "completed",
    )
    .slice(0, 8);
  const clinicQueueRows = [...clinicAwaiting, ...clinicToday].filter(
    (v, i, arr) =>
      arr.findIndex((x) => x.id === v.id) === i &&
      ["intake", "queued", "in_progress", "awaiting_review"].includes(v.status),
  );
  const voiceChartingVisit = pickVoiceChartingVisit(queueRows) ?? pickVoiceChartingVisit(clinicQueueRows);
  const voiceChartingPatient = voiceChartingVisit
    ? patientById[voiceChartingVisit.patient_id]
    : null;
  const voiceToTextHref =
    voiceChartingVisit && voiceChartingPatient
      ? `/emr/${voiceChartingPatient.id}/visits/new?vid=${voiceChartingVisit.id}&mode=record`
      : "/emr";
 
  const doctorShort = `Dr. ${member.full_name.split(" ")[0]}`;
  const doctorById = new Map(doctorRoster.map((doctor) => [doctor.id, doctor.full_name]));
 
  return (
    <div className="premium-shell">
      <DashboardHero
        name={member.full_name}
        clinicName={clinic.name}
        honorific
        waveEmoji
      />
 
      {/* ── Stat cards ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Queue"
          value={queuedCount}
          hint="patients checked in"
          icon={<UsersIcon />}
          tone="brand"
        />
        <StatCard
          label="With Doctor"
          value={withDoctorCount}
          hint="currently being seen"
          icon={<ClockIcon />}
          tone="sky"
        />
        <StatCard
          label="Reviewed"
          value={reviewedCount}
          hint="completed visits"
          icon={<CheckCircleIcon />}
          tone="accent"
        />
        <StatCard
          label="Pending Intake"
          value={pendingIntakeCount}
          hint="vitals not captured"
          icon={<ClipboardIcon />}
          tone="amber"
        />
      </section>
 
      {/* ── Today's Intake Queue ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
            <span className="text-[#0ea5a4]">📋</span>
            Today&apos;s Intake Queue
          </h2>
          <Link href="/emr/new" className="btn-teal">
            <PlusIcon />
            New EMR
          </Link>
        </div>
 
        <div className="premium-panel overflow-hidden">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>EMR ID</th>
                <th>Vitals</th>
                <th>Doctor</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm font-medium text-[#64748b] dark:text-ink-500">
                    No records yet.
                  </td>
                </tr>
              ) : (
                queueRows.map((v) => {
                  const p = patientById[v.patient_id];
                  if (!p) return null;
                  const target =
                    v.status === "awaiting_review"
                      ? `/emr/${p.id}/visits/${v.id}/review`
                      : v.status === "intake"
                        ? `/emr/${p.id}/visits/${v.id}/intake`
                        : `/emr/${p.id}/visits/new?vid=${v.id}&mode=record`;
                  const actionLabel =
                    v.status === "awaiting_review"
                      ? "Review"
                      : v.status === "intake"
                        ? "Intake"
                        : "Open";
                  const vitalsCaptured = v.status !== "intake";
                  return (
                    <tr
                      key={v.id}
                      className="last:border-0"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)" }}
                          >
                            {initials(p.full_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#0f172a] dark:text-ink-100">
                              {p.full_name}
                            </div>
                            <div className="truncate text-[11px] text-[#64748b] dark:text-ink-500">
                              {p.age != null ? `${p.age}${p.sex || ""}` : "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#64748b] dark:text-ink-400">
                        {p.emr_number}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            vitalsCaptured
                              ? "bg-[#ecfdf5] text-[#059669] dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-[#fff7ed] text-[#ea580c] dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {vitalsCaptured ? "Captured" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#334155] dark:text-ink-300">
                        {doctorShort}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={v.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={target}
                          className="premium-action"
                        >
                          {actionLabel}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
 
      {/* ── Completed Today ── */}
      {completedRows.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
              <span className="text-emerald-600">✓</span>
              Completed Today
            </h2>
          </div>
 
          <div className="premium-panel overflow-hidden">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>EMR ID</th>
                  <th>Time</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {completedRows.map((v) => {
                  const p = patientById[v.patient_id];
                  if (!p) return null;
                  const completedTime = v.completed_at ? new Date(v.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
                  return (
                    <tr key={v.id} className="last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)" }}
                          >
                            {initials(p.full_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#0f172a] dark:text-ink-100">
                              {p.full_name}
                            </div>
                            <div className="truncate text-[11px] text-[#64748b] dark:text-ink-500">
                              {p.age != null ? `${p.age}${p.sex || ""}` : "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#64748b] dark:text-ink-400">
                        {p.emr_number}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#64748b] dark:text-ink-400">
                        {completedTime}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/emr/${p.id}`} className="premium-action">
                          View EMR
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
 
      {/* ── Clinical Modules ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
            <span className="text-[#0ea5a4]">Referral</span>
            Referrals received
          </h2>
        </div>
 
        <div className="premium-panel overflow-hidden">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>From</th>
                <th>Specialty</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {receivedReferrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-medium text-[#64748b] dark:text-ink-500">
                    No referrals received yet.
                  </td>
                </tr>
              ) : (
                receivedReferrals.map((referral) => {
                  const patient = patientById[referral.patient_id];
                  const referringDoctor = doctorById.get(referral.referring_doctor_id) || "Clinic doctor";
 
                  return (
                    <tr key={referral.id}>
                      <td className="px-5 py-3.5">
                        {patient ? (
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                              style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)" }}
                            >
                              {initials(patient.full_name)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#0f172a] dark:text-ink-100">
                                {patient.full_name}
                              </div>
                              <div className="truncate text-[11px] text-[#64748b] dark:text-ink-500">
                                {patient.emr_number}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#64748b]">Patient unavailable</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#334155] dark:text-ink-300">
                        {referringDoctor}
                      </td>
                      <td className="px-5 py-3.5 text-[#334155] dark:text-ink-300">
                        {referral.referred_to_specialty}
                        <div className="mt-0.5 text-[11px] text-[#64748b]">
                          {formatDate(referral.created_at)}
                        </div>
                      </td>
                      <td className="max-w-[360px] px-5 py-3.5 text-[#334155] dark:text-ink-300">
                        <span className="line-clamp-2">{referral.reason}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <ReferralStatusPill status={referral.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {patient ? (
                          <Link href={`/emr/${patient.id}`} className="premium-action">
                            Open EMR
                          </Link>
                        ) : (
                          <span className="text-[12px] font-semibold text-slate-400">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
 
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
 
function pickVoiceChartingVisit(visits: Visit[]) {
  return (
    visits.find((v) => v.status === "queued" || v.status === "in_progress") ??
    visits.find((v) => v.status === "intake")
  );
}
 
function StatusPill({ status }: { status: Visit["status"] }) {
  const map: Record<Visit["status"], { cls: string; label: string }> = {
    intake:          { cls: "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400",              label: "Intake" },
    queued:          { cls: "bg-[#ecfeff] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300",            label: "In Queue" },
    in_progress:     { cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",         label: "With Doctor" },
    awaiting_review: { cls: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",     label: "Draft" },
    completed:       { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: "Done" },
    cancelled:       { cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",             label: "Cancelled" },
  };
  const { cls, label } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
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
 
 