"use client";

import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  UsersIcon,
  CheckCircleIcon,
  SparkleIcon,
  ClockIcon,
  MicIcon,
  CalendarIcon,
} from "@/components/dashboard/icons";
import { ConsultationLauncher } from "@/components/intake/ConsultationLauncher";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import {
  formatTime,
  initials,
  avgMinutes,
} from "@/lib/dashboard-utils";
import type { Appointment, Clinic, Doctor, Patient, Visit } from "@/types/db";

export function DoctorDashboard({
  member,
  clinic,
  myToday,
  myAwaiting,
  patientById,
  myAppointments,
}: {
  member: Doctor;
  clinic: Clinic;
  myToday: Visit[];
  myAwaiting: Visit[];
  patientById: Record<string, Patient>;
  myAppointments: Appointment[];
}) {
  const inQueue = myToday.filter((v) =>
    ["queued", "in_progress"].includes(v.status),
  );
  const completed = myToday.filter((v) => v.status === "completed");
  const reviewedCount = completed.length;
  const totalToday = myToday.length;
  const percentDone =
    totalToday === 0 ? 0 : Math.round((reviewedCount / totalToday) * 100);
  const avgVisitMin = avgMinutes(
    completed
      .filter((v) => v.completed_at)
      .map((v) => [v.completed_at as string, v.visit_date]),
  );

  return (
    <div className="space-y-8">
      <DashboardHero
        name={member.full_name}
        clinicName={clinic.name}
        honorific
        actions={
          <>
            <Link href="/appointments" className="btn-secondary">
              <CalendarIcon />
              My schedule
            </Link>
            <Link href="/emr/new" className="btn-primary">
              <MicIcon />
              New consultation
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patients in queue"
          value={inQueue.length}
          hint="waiting for you"
          icon={<UsersIcon />}
          tone="brand"
        />
        <StatCard
          label="Reviewed today"
          value={`${reviewedCount}${totalToday ? ` / ${totalToday}` : ""}`}
          hint={totalToday ? `${percentDone}% complete` : "no visits yet"}
          icon={<CheckCircleIcon />}
          tone="violet"
        />
        <StatCard
          label="AI drafts to review"
          value={myAwaiting.length}
          hint="needs your sign-off"
          icon={<SparkleIcon />}
          tone="amber"
        />
        <StatCard
          label="Avg visit time"
          value={avgVisitMin > 0 ? `${avgVisitMin} min` : "—"}
          hint="from start to save"
          icon={<ClockIcon />}
          tone="sky"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                My queue
              </h2>
              <Link href="/emr" className="text-xs font-medium text-brand-700 hover:underline">
                All my patients →
              </Link>
            </div>
            {inQueue.length === 0 && myAwaiting.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900/40 p-8 text-center text-sm text-slate-500 dark:text-ink-500">
                No patients waiting. The reception will route them here.
              </div>
            ) : (
              <ul className="space-y-2">
                {[...myAwaiting, ...inQueue].slice(0, 8).map((v) => {
                  const p = patientById[v.patient_id];
                  if (!p) return null;
                  const target =
                    v.status === "awaiting_review"
                      ? `/emr/${p.id}/visits/${v.id}/review`
                      : `/emr/${p.id}/visits/new?vid=${v.id}&mode=record`;
                  return (
                    <li key={v.id}>
                      <Link
                        href={target}
                        className="card flex items-center justify-between gap-3 p-4 transition hover:border-brand-300 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-200 to-brand-100 text-xs font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
                            {initials(p.full_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                              {p.full_name}
                            </div>
                            <div className="truncate text-[11px] text-slate-500 dark:text-ink-500">
                              {p.emr_number}
                              {p.age != null ? ` · ${p.age}${p.sex || ""}` : ""}
                              {v.chief_complaints
                                ? ` · ${v.chief_complaints.slice(0, 60)}`
                                : ""}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            v.status === "awaiting_review"
                              ? "bg-amber-100 text-amber-800"
                              : v.status === "in_progress"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {v.status === "awaiting_review"
                            ? "Draft ready"
                            : v.status === "in_progress"
                              ? "In progress"
                              : "Waiting"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <ConsultationLauncher currentUserId={member.id} />
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                My schedule
              </h2>
              <Link href="/appointments" className="text-xs font-medium text-brand-700 hover:underline">
                Manage →
              </Link>
            </div>
            {myAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900/40 p-6 text-center text-xs text-slate-500 dark:text-ink-500">
                No appointments today.
              </div>
            ) : (
              <ul className="space-y-2">
                {myAppointments.slice(0, 6).map((a) => {
                  const p = a.patient_id ? patientById[a.patient_id] : null;
                  return (
                    <li
                      key={a.id}
                      className="card flex items-center gap-3 p-3"
                    >
                      <span className="flex flex-col items-center rounded-lg bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        <span className="text-sm leading-tight">
                          {formatTime(a.scheduled_at)}
                        </span>
                        <span className="leading-tight">
                          {a.duration_minutes}m
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-ink-100">
                          {p?.full_name || "(unknown patient)"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-ink-500">
                          {labelType(a.type)}
                          {a.priority !== "normal"
                            ? ` · ${a.priority}`
                            : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function labelType(t: Appointment["type"]) {
  return (
    {
      regular: "Regular",
      follow_up: "Follow-up",
      emergency: "Emergency",
      procedure: "Procedure",
    } as const
  )[t];
}
