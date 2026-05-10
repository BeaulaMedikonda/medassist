"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  UsersIcon,
  ClipboardIcon,
  SparkleIcon,
  BuildingIcon,
  ActivityIcon,
} from "@/components/dashboard/icons";
import { InviteCodeBox } from "@/components/dashboard/InviteCodeBox";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { formatTime, initials } from "@/lib/dashboard-utils";
import type {
  Appointment,
  Clinic,
  Doctor,
  Patient,
  Visit,
} from "@/types/db";

export function AdminDashboard({
  member,
  clinic,
  todayVisits,
  awaitingVisits,
  patientById,
  assignments,
  doctorById,
  roster,
  todayAppointments,
  totalPatients,
  monthlyAiDrafts,
}: {
  member: Doctor;
  clinic: Clinic;
  todayVisits: Visit[];
  awaitingVisits: Visit[];
  patientById: Record<string, Patient>;
  assignments: Array<{ visit_id: string; doctor_id: string; role: string }>;
  doctorById: Record<string, Pick<Doctor, "id" | "full_name" | "qualification" | "role">>;
  roster: Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>;
  todayAppointments: Appointment[];
  totalPatients: number;
  monthlyAiDrafts: number;
}) {
  const [inviteCode, setInviteCode] = useState(clinic.invite_code);

  const doctorsCount = roster.filter((r) => r.role === "doctor").length;
  const maCount = roster.filter((r) => r.role === "medical_assistant").length;
  const adminCount = roster.filter((r) => r.role === "admin").length;

  // Recent activity: combine today's visit transitions and appointments.
  const recent: Array<{
    id: string;
    when: string;
    title: string;
    detail: string;
    tone: "brand" | "amber" | "sky" | "violet";
  }> = [];
  for (const v of todayVisits.slice(0, 20)) {
    const p = patientById[v.patient_id];
    if (!p) continue;
    if (v.status === "completed" && v.completed_at) {
      recent.push({
        id: `v-${v.id}-done`,
        when: v.completed_at,
        title: `${p.full_name} — visit completed`,
        detail: `EMR ${p.emr_number}`,
        tone: "violet",
      });
    } else if (v.status === "awaiting_review") {
      recent.push({
        id: `v-${v.id}-draft`,
        when: v.updated_at,
        title: `AI draft ready — ${p.full_name}`,
        detail: `EMR ${p.emr_number}`,
        tone: "amber",
      });
    } else {
      recent.push({
        id: `v-${v.id}-new`,
        when: v.visit_date,
        title: `${p.full_name} — checked in`,
        detail: `EMR ${p.emr_number}`,
        tone: "brand",
      });
    }
  }
  for (const a of todayAppointments.slice(0, 10)) {
    const p = a.patient_id ? patientById[a.patient_id] : null;
    if (!p) continue;
    recent.push({
      id: `a-${a.id}`,
      when: a.scheduled_at,
      title: `Appointment — ${p.full_name}`,
      detail: `${labelType(a.type)} with Dr. ${doctorById[a.doctor_id]?.full_name?.split(" ")[0] || "—"}`,
      tone: "sky",
    });
  }
  recent.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  return (
    <div className="space-y-8">
      <DashboardHero
        name={member.full_name}
        clinicName={clinic.name}
        actions={
          <>
            <Link href="/settings/team" className="btn-secondary">
              <UsersIcon />
              Manage team
            </Link>
            <Link href="/settings" className="btn-primary">
              Clinic settings
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patients today"
          value={todayVisits.length}
          hint={`${todayVisits.filter((v) => v.status === "completed").length} completed`}
          icon={<UsersIcon />}
          tone="brand"
        />
        <StatCard
          label="Total EMRs"
          value={totalPatients}
          hint="all-time"
          icon={<ClipboardIcon />}
          tone="violet"
          href="/emr"
        />
        <StatCard
          label="AI drafts (this month)"
          value={monthlyAiDrafts}
          hint={`${awaitingVisits.length} awaiting review now`}
          icon={<SparkleIcon />}
          tone="amber"
        />
        <StatCard
          label="Staff"
          value={roster.length}
          hint={`${doctorsCount} doctors · ${maCount} MAs · ${adminCount} admin`}
          icon={<BuildingIcon />}
          tone="sky"
          href="/settings/team"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                Clinic overview
              </h2>
              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-ink-100">
                {clinic.name}
              </h3>
            </div>
            <Link
              href="/settings"
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Edit details →
            </Link>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Row k="Address" v={clinic.address || "—"} />
            <Row
              k="Location"
              v={
                [clinic.city, clinic.state].filter(Boolean).join(", ") || "—"
              }
            />
            <Row k="Phone" v={clinic.phone || "—"} />
            <Row k="Email" v={clinic.email || "—"} />
            <Row
              k="Established"
              v={clinic.established_year ? String(clinic.established_year) : "—"}
            />
            <Row k="Letterhead footer" v={clinic.letterhead_footer || "—"} className="sm:col-span-2" />
          </dl>
        </div>

        <InviteCodeBox
          clinicId={clinic.id}
          initialCode={inviteCode}
          onChange={setInviteCode}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              <ActivityIcon /> Recent activity
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-ink-600">
              {recent.length} events today
            </span>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900/40 p-8 text-center text-sm text-slate-500 dark:text-ink-500">
              Nothing has happened yet today.
            </div>
          ) : (
            <ol className="space-y-2">
              {recent.slice(0, 12).map((e) => (
                <li
                  key={e.id}
                  className="card flex items-start gap-3 p-3"
                >
                  <span
                    className={`mt-1 flex h-2 w-2 shrink-0 rounded-full ${
                      e.tone === "violet"
                        ? "bg-violet-500"
                        : e.tone === "amber"
                          ? "bg-amber-500"
                          : e.tone === "sky"
                            ? "bg-sky-500"
                            : "bg-brand-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-ink-100">
                      {e.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-ink-500">{e.detail}</div>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-ink-600">
                    {formatTime(e.when)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Team
            </h2>
            <Link href="/settings/team" className="text-xs font-medium text-brand-700 hover:underline">
              Manage →
            </Link>
          </div>
          <ul className="space-y-2">
            {roster.slice(0, 6).map((r) => (
              <li key={r.id} className="card flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-ink-800 dark:text-ink-300">
                  {initials(r.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-ink-100">
                    {r.role === "doctor" ? `Dr. ${r.full_name}` : r.full_name}
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-ink-500">
                    {roleLabel(r.role)}
                    {r.qualification ? ` · ${r.qualification}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v, className = "" }: { k: string; v: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-ink-500">{k}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 dark:text-ink-200">{v}</dd>
    </div>
  );
}

function roleLabel(r: Doctor["role"]) {
  return r === "medical_assistant" ? "Medical Assistant" : r === "admin" ? "Admin" : "Doctor";
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
