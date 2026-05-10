"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toast";
import { BookAppointmentModal } from "./BookAppointmentModal";
import { PlusIcon } from "@/components/dashboard/icons";
import { WeekStrip } from "@/components/appointments/WeekStrip";
import { formatTime, initials } from "@/lib/dashboard-utils";
import type { Appointment, Doctor, Patient, StaffRole } from "@/types/db";

type DoctorOption = Pick<Doctor, "id" | "full_name" | "qualification" | "role">;

const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 18; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export function AppointmentsClient({
  currentUserId,
  clinicId,
  role,
  doctors,
  patients,
  dayAppointments,
  upcoming,
  isoDate,
  weekCounts,
}: {
  currentUserId: string;
  clinicId: string;
  role: StaffRole;
  doctors: DoctorOption[];
  patients: Patient[];
  dayAppointments: Appointment[];
  upcoming: Appointment[];
  isoDate: string;
  weekCounts: Record<string, number>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [bookOpen, setBookOpen] = useState(false);
  // Doctors only ever see their own; the filter UI is hidden for them.
  const isDoctor = role === "doctor";
  const [doctorFilter, setDoctorFilter] = useState<string>(
    isDoctor ? currentUserId : "all",
  );

  const patientById = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);
  const doctorById = useMemo(() => {
    const m = new Map<string, DoctorOption>();
    for (const d of doctors) m.set(d.id, d);
    return m;
  }, [doctors]);

  const filtered = useMemo(() => {
    if (doctorFilter === "all") return dayAppointments;
    return dayAppointments.filter((a) => a.doctor_id === doctorFilter);
  }, [dayAppointments, doctorFilter]);

  const apptByTime = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const t = new Date(a.scheduled_at);
      const key = `${String(t.getHours()).padStart(2, "0")}:${t.getMinutes() < 30 ? "00" : "30"}`;
      const list = m.get(key) || [];
      list.push(a);
      m.set(key, list);
    }
    return m;
  }, [filtered]);

  function selectDate(iso: string) {
    router.push(`/appointments?date=${iso}`);
  }

  async function checkIn(a: Appointment) {
    const sb = supabaseBrowser();
    const { error } = await sb
      .from("appointments")
      .update({ status: "checked_in" })
      .eq("id", a.id);
    if (error) {
      push({ title: "Could not check in", description: error.message, variant: "error" });
      return;
    }
    push({ title: "Checked in", variant: "success" });
    router.refresh();
  }

  async function cancel(a: Appointment) {
    if (!confirm("Cancel this appointment?")) return;
    const sb = supabaseBrowser();
    const { error } = await sb
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", a.id);
    if (error) {
      push({ title: "Could not cancel", description: error.message, variant: "error" });
      return;
    }
    push({ title: "Cancelled", variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-ink-500">
            {isDoctor
              ? "Your day at a glance — pick a date or jump weeks."
              : "Schedule visits, manage doctor calendars, and check patients in."}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBookOpen(true)} className="btn-primary">
            <PlusIcon />
            Book appointment
          </button>
        </div>
      </header>

      <WeekStrip
        isoDate={isoDate}
        appointmentCounts={weekCounts}
        onSelect={selectDate}
      />

      {!isDoctor ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-ink-500">
            Doctor filter
          </span>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="input-base max-w-[220px] py-1.5 text-xs"
          >
            <option value="all">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
          Day schedule
        </h2>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-500">
            No appointments scheduled. Tap "Book appointment" to add one.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-ink-900/40 dark:text-ink-500">
                <tr>
                  <th className="w-24 px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Patient</th>
                  <th className="px-4 py-2 text-left">Doctor</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {TIME_SLOTS.map((slot) => {
                  const items = apptByTime.get(slot) || [];
                  if (items.length === 0) return null;
                  return items.map((a, i) => {
                    const p = a.patient_id ? patientById.get(a.patient_id) : null;
                    const d = doctorById.get(a.doctor_id);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-ink-900/40">
                        {i === 0 ? (
                          <td className="px-4 py-3 align-top text-xs font-semibold text-slate-700 dark:text-ink-300">
                            {formatTime(a.scheduled_at)}
                          </td>
                        ) : (
                          <td className="px-4 py-3"></td>
                        )}
                        <td className="px-4 py-3">
                          {p ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-100 text-[10px] font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
                                {initials(p.full_name)}
                              </span>
                              <div>
                                <div className="text-sm font-medium text-slate-900 dark:text-ink-100">
                                  {p.full_name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-ink-500">
                                  {p.emr_number}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-ink-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-ink-300">
                          {d ? `Dr. ${d.full_name.split(" ")[0]}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={a.type} />
                          {a.priority !== "normal" ? (
                            <PriorityBadge priority={a.priority} />
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActionButtons
                            appt={a}
                            role={role}
                            currentUserId={currentUserId}
                            onCheckIn={() => checkIn(a)}
                            onCancel={() => cancel(a)}
                          />
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
            Upcoming (next 7 days)
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {upcoming.slice(0, 8).map((a) => {
              const p = a.patient_id ? patientById.get(a.patient_id) : null;
              const d = doctorById.get(a.doctor_id);
              return (
                <li key={a.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                      {p?.full_name || "(unknown patient)"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-ink-500">
                      {new Date(a.scheduled_at).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {formatTime(a.scheduled_at)} ·{" "}
                      {d ? `Dr. ${d.full_name.split(" ")[0]}` : "—"}
                    </div>
                  </div>
                  <TypeBadge type={a.type} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {bookOpen ? (
        <BookAppointmentModal
          currentUserId={currentUserId}
          clinicId={clinicId}
          role={role}
          doctors={doctors}
          patients={patients}
          defaultDate={isoDate}
          onClose={() => setBookOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TypeBadge({ type }: { type: Appointment["type"] }) {
  const labels: Record<Appointment["type"], string> = {
    regular: "Regular",
    follow_up: "Follow-up",
    emergency: "Emergency",
    procedure: "Procedure",
  };
  const styles: Record<Appointment["type"], string> = {
    regular:
      "bg-slate-100 text-slate-700 ring-1 ring-slate-200/60 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700/60",
    follow_up:
      "bg-brand-100 text-brand-800 ring-1 ring-brand-200/60 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800/60",
    emergency:
      "bg-rose-100 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800/60",
    procedure:
      "bg-violet-100 text-violet-700 ring-1 ring-violet-200/60 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800/60",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: Appointment["priority"] }) {
  const styles: Record<Appointment["priority"], string> = {
    normal: "",
    urgent:
      "ml-1 bg-rose-100 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800/60",
    routine:
      "ml-1 bg-slate-100 text-slate-600 ring-1 ring-slate-200/60 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700/60",
  };
  if (priority === "normal") return null;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[priority]}`}>
      {priority}
    </span>
  );
}
function StatusBadge({ status }: { status: Appointment["status"] }) {
  const labels: Record<Appointment["status"], string> = {
    scheduled: "Scheduled",
    checked_in: "Checked in",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  };
  const styles: Record<Appointment["status"], string> = {
    scheduled:
      "bg-sky-100 text-sky-700 ring-1 ring-sky-200/60 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-800/60",
    checked_in:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800/60",
    completed:
      "bg-violet-100 text-violet-700 ring-1 ring-violet-200/60 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800/60",
    cancelled:
      "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700/60",
    no_show:
      "bg-rose-100 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800/60",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ActionButtons({
  appt,
  role,
  currentUserId,
  onCheckIn,
  onCancel,
}: {
  appt: Appointment;
  role: StaffRole;
  currentUserId: string;
  onCheckIn: () => void;
  onCancel: () => void;
}) {
  const canCheckIn =
    appt.status === "scheduled" &&
    (role === "medical_assistant" || role === "admin" || appt.doctor_id === currentUserId);
  const canCancel = appt.status === "scheduled" || appt.status === "checked_in";
  if (!canCheckIn && !canCancel) {
    return <span className="text-[11px] text-slate-400 dark:text-ink-600">—</span>;
  }
  return (
    <div className="flex justify-end gap-1">
      {canCheckIn ? (
        <button
          onClick={onCheckIn}
          className="rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Check in
        </button>
      ) : null}
      {canCancel ? (
        <button
          onClick={onCancel}
          className="rounded-lg px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
