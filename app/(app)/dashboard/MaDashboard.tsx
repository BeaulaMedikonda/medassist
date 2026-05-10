"use client";

import { useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  UsersIcon,
  SparkleIcon,
  CheckCircleIcon,
  ClipboardIcon,
  PlusIcon,
  CalendarIcon,
} from "@/components/dashboard/icons";
import { NewPatientModal } from "@/components/intake/NewPatientModal";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { initials, formatTime } from "@/lib/dashboard-utils";
import type { Clinic, Doctor, Patient, Visit } from "@/types/db";

export function MaDashboard({
  member,
  clinic,
  todayVisits,
  awaitingVisits,
  patientById,
  assignments,
  doctorRoster,
  currentUserId,
}: {
  member: Doctor;
  clinic: Clinic;
  todayVisits: Visit[];
  awaitingVisits: Visit[];
  patientById: Record<string, Patient>;
  assignments: Array<{ visit_id: string; doctor_id: string; role: string }>;
  doctorRoster: Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>;
  currentUserId: string;
}) {
  const [intakeOpen, setIntakeOpen] = useState(false);

  const checkedIn = todayVisits.filter((v) =>
    ["queued", "in_progress", "awaiting_review", "completed"].includes(v.status),
  ).length;
  const completedToday = todayVisits.filter((v) => v.status === "completed").length;
  const pendingIntake = todayVisits.filter((v) => v.status === "intake").length;
  const aiDrafts = awaitingVisits.length;

  const queueItems = todayVisits.filter((v) =>
    ["queued", "in_progress", "intake"].includes(v.status),
  );
  const assignmentsByVisit = new Map<string, Array<{ doctor_id: string; role: string }>>();
  for (const a of assignments) {
    const list = assignmentsByVisit.get(a.visit_id) || [];
    list.push(a);
    assignmentsByVisit.set(a.visit_id, list);
  }
  const doctorById = new Map(doctorRoster.map((d) => [d.id, d]));

  return (
    <div className="space-y-8">
      <DashboardHero
        name={member.full_name}
        clinicName={clinic.name}
        actions={
          <>
            <Link href="/appointments" className="btn-secondary">
              <CalendarIcon />
              Appointments
            </Link>
            <button onClick={() => setIntakeOpen(true)} className="btn-primary">
              <PlusIcon />
              New patient intake
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patients checked in"
          value={checkedIn}
          hint="today"
          icon={<UsersIcon />}
          tone="brand"
        />
        <StatCard
          label="AI drafts awaiting review"
          value={aiDrafts}
          hint="across all doctors"
          icon={<SparkleIcon />}
          tone="amber"
          href="/emr"
        />
        <StatCard
          label="Completed visits"
          value={completedToday}
          hint="today"
          icon={<CheckCircleIcon />}
          tone="violet"
        />
        <StatCard
          label="Pending intake"
          value={pendingIntake}
          hint="not yet routed"
          icon={<ClipboardIcon />}
          tone="sky"
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
            Today's intake queue
          </h2>
          <Link href="/emr" className="text-xs font-medium text-brand-700 hover:underline">
            View all patients →
          </Link>
        </div>
        {queueItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900/40 p-8 text-center text-sm text-slate-500 dark:text-ink-500">
            No patients in the queue right now. Tap "New patient intake" to begin.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {queueItems.map((v) => {
              const p = patientById[v.patient_id];
              if (!p) return null;
              const assigned = (assignmentsByVisit.get(v.id) || [])
                .map((a) => doctorById.get(a.doctor_id))
                .filter(Boolean);
              return (
                <li key={v.id}>
                  <Link
                    href={`/emr/${p.id}/visits/${v.id}/intake`}
                    className="card flex flex-col gap-2 p-4 transition hover:border-brand-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-200 to-brand-100 text-xs font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
                          {initials(p.full_name)}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                            {p.full_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-ink-500">
                            {p.emr_number}
                            {p.age != null ? ` · ${p.age}${p.sex || ""}` : ""}
                          </div>
                        </div>
                      </div>
                      <StatusPill status={v.status} />
                    </div>
                    {v.chief_complaints ? (
                      <p className="line-clamp-2 text-xs text-slate-600 dark:text-ink-400">
                        <span className="font-medium text-slate-700 dark:text-ink-300">CC:</span>{" "}
                        {v.chief_complaints}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {assigned.length === 0 ? (
                          <span className="text-[11px] italic text-slate-400 dark:text-ink-600">
                            Unassigned
                          </span>
                        ) : (
                          assigned.map((d) => (
                            <span
                              key={d!.id}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium dark:bg-ink-800 text-slate-700 dark:text-ink-300"
                            >
                              Dr. {d!.full_name.split(" ")[0]}
                            </span>
                          ))
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-ink-600">
                        {formatTime(v.visit_date)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {awaitingVisits.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              AI drafts awaiting doctor review
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {awaitingVisits.slice(0, 6).map((v) => {
              const p = patientById[v.patient_id];
              if (!p) return null;
              return (
                <li key={v.id}>
                  <Link
                    href={`/emr/${p.id}/visits/${v.id}/review`}
                    className="card flex items-center justify-between gap-3 p-4 transition hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                        {p.full_name}
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-ink-500">
                        {p.emr_number} · drafted {formatTime(v.updated_at)}
                      </div>
                    </div>
                    <span className="badge bg-amber-100 text-amber-700">
                      Draft ready
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {intakeOpen ? (
        <NewPatientModal
          currentUserId={currentUserId}
          clinicId={clinic.id}
          doctors={doctorRoster.map((d) => ({
            id: d.id,
            full_name: d.full_name,
            qualification: d.qualification,
          }))}
          onClose={() => setIntakeOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: Visit["status"] }) {
  const styles: Record<Visit["status"], string> = {
    intake: "bg-slate-100 text-slate-700 dark:text-ink-300",
    queued: "bg-sky-100 text-sky-700",
    in_progress: "bg-amber-100 text-amber-800",
    awaiting_review: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-rose-100 text-rose-700",
  };
  const labels: Record<Visit["status"], string> = {
    intake: "Intake",
    queued: "In queue",
    in_progress: "In consult",
    awaiting_review: "Draft",
    completed: "Done",
    cancelled: "Cancelled",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
