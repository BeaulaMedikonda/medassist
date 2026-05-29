"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type DoctorRow = {
  id: string;
  full_name: string;
  qualification: string | null;
};

type PatientRow = {
  id: string;
  full_name: string;
  emr_number: string;
  phone: string | null;
};

type AppointmentRow = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: string;
  priority: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  clinicId: string;
  clinicName: string;
  currentUserId: string;
  doctors: DoctorRow[];
  patients: PatientRow[];
  appointments: AppointmentRow[];
  error: string | null;
};

function todayInputValue() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function endOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

function formatDayHeading(dateValue: string) {
  const date = new Date(dateValue);

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateValue: string) {
  const date = new Date(dateValue);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getCurrentWeekDays() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      label: date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
      day: date.getDate(),
      date,
      key: date.toISOString().slice(0, 10),
    };
  });
}

function getWeekLabel() {
  const days = getCurrentWeekDays();
  const first = days[0].date;
  const last = days[days.length - 1].date;

  const firstLabel = first.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
  });

  const lastLabel = last.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
  });

  return `${firstLabel} – ${lastLabel}`;
}

function appointmentsForDate(appointments: AppointmentRow[], date: Date) {
  return appointments.filter((appointment) =>
    isSameDay(new Date(appointment.scheduled_at), date),
  );
}

function getDoctorName(doctorId: string, doctors: DoctorRow[]) {
  return doctors.find((doctor) => doctor.id === doctorId)?.full_name || "—";
}

function getPatient(patientId: string | null, patients: PatientRow[]) {
  if (!patientId) return null;
  return patients.find((patient) => patient.id === patientId) || null;
}

function prettyText(value: string | null | undefined) {
  if (!value) return "—";

  if (value === "regular") return "Regular Consultation";
  if (value === "follow_up") return "Follow Up";
  if (value === "emergency") return "Emergency";
  if (value === "procedure") return "Procedure";
  if (value === "checked_in") return "Checked In";
  if (value === "no_show") return "No Show";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusBadgeClass(status: string) {
  const value = status.toLowerCase();

  if (value === "scheduled") return "bg-sky-50 text-sky-700 ring-sky-200";
  if (value === "checked_in") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value === "cancelled" || value === "no_show") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export function AppointmentsClient({
  clinicId,
  clinicName,
  currentUserId,
  doctors,
  patients,
  appointments,
  error,
}: Props) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"weekly" | "list">("list");

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [date, setDate] = useState(todayInputValue());
  const [timeSlot, setTimeSlot] = useState("09:00");
  const [appointmentType, setAppointmentType] = useState("regular");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekDays = getCurrentWeekDays();

  const todayAppointments = appointments.filter((appointment) => {
    const scheduled = new Date(appointment.scheduled_at);
    return scheduled >= todayStart && scheduled <= todayEnd;
  });

  const upcomingAppointments = appointments.filter((appointment) => {
    const scheduled = new Date(appointment.scheduled_at);
    return scheduled > todayEnd;
  });

  const timeSlots = useMemo(
    () => [
      { label: "09:00 AM", value: "09:00" },
      { label: "09:30 AM", value: "09:30" },
      { label: "10:00 AM", value: "10:00" },
      { label: "10:30 AM", value: "10:30" },
      { label: "11:00 AM", value: "11:00" },
      { label: "11:30 AM", value: "11:30" },
      { label: "12:00 PM", value: "12:00" },
      { label: "02:00 PM", value: "14:00" },
      { label: "02:30 PM", value: "14:30" },
      { label: "03:00 PM", value: "15:00" },
      { label: "03:30 PM", value: "15:30" },
      { label: "04:00 PM", value: "16:00" },
      { label: "04:30 PM", value: "16:30" },
      { label: "05:00 PM", value: "17:00" },
    ],
    [],
  );

  function openBookingModal() {
    setFormError(null);
    setPatientId(patients[0]?.id || "");
    setDoctorId(doctors[0]?.id || "");
    setDate(todayInputValue());
    setTimeSlot("09:00");
    setAppointmentType("regular");
    setPriority("normal");
    setNotes("");
    setShowBookingModal(true);
  }

  function closeBookingModal() {
    if (saving) return;
    setShowBookingModal(false);
    setFormError(null);
  }

  async function handleBookAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!patientId) {
      setFormError("Please select a patient.");
      return;
    }

    if (!doctorId) {
      setFormError("Please select a doctor.");
      return;
    }

    if (!date) {
      setFormError("Please select appointment date.");
      return;
    }

    if (!timeSlot) {
      setFormError("Please select time slot.");
      return;
    }

    setSaving(true);

    try {
      const supabase = supabaseBrowser();
      const scheduledAt = new Date(`${date}T${timeSlot}:00`);

      const { error: insertError } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        doctor_id: doctorId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 15,
        type: appointmentType,
        priority,
        status: "scheduled",
        notes: notes.trim() || null,
        created_by: currentUserId,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setShowBookingModal(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="premium-shell">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-tight text-slate-900">
              <span>🗓️</span>
              Appointment Scheduling
            </h1>
            <p className="mt-1 text-sm text-slate-500">{clinicName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <button
              type="button"
              onClick={() => setShowRecallModal(true)}
              className="btn-secondary"
            >
              📋 Recall Board
            </button>

            <button
              type="button"
              onClick={() => setShowWaitlistModal(true)}
              className="btn-secondary"
            >
              ⏳ Waitlist
            </button>

            <button
              type="button"
              onClick={openBookingModal}
              className="btn-teal"
            >
              + Book Appointment
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <button
              type="button"
              onClick={() => setViewMode("weekly")}
              className={`border-b-2 pb-3 text-[13px] ${
                viewMode === "weekly"
                  ? "border-[#0f8f83] font-extrabold text-[#0f8f83]"
                  : "border-transparent font-medium text-slate-500 hover:text-slate-900"
              }`}
            >
              🗓️ Weekly Calendar — {getWeekLabel()}
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`border-b-2 pb-3 text-[13px] ${
                viewMode === "list"
                  ? "border-[#0f8f83] font-extrabold text-[#0f8f83]"
                  : "border-transparent font-medium text-slate-500 hover:text-slate-900"
              }`}
            >
              📋 List View
            </button>
          </div>
        </div>

        <p className="text-[13px] text-slate-500">
          {viewMode === "weekly"
            ? "Showing weekly calendar mode. Review appointments across the week."
            : "Showing list mode. Use the slot suggestions below for optimal scheduling."}
        </p>

        {error ? (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {viewMode === "weekly" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {weekDays.map((day) => {
              const dayAppointments = appointmentsForDate(appointments, day.date);

              return (
                <div
                  key={day.key}
                  className="premium-panel min-h-[190px] p-4"
                >
                  <div className="mb-5">
                    <div className="text-[12px] font-extrabold text-slate-500">
                      {day.label} {day.day}
                    </div>
                  </div>

                  {dayAppointments.length === 0 ? (
                    <p className="text-[13px] text-slate-500">No appointments</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAppointments.map((appointment) => {
                        const patient = getPatient(appointment.patient_id, patients);

                        return (
                          <div
                            key={appointment.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="text-[12px] font-extrabold text-slate-900">
                              {formatTime(appointment.scheduled_at)}
                            </div>
                            <div className="mt-1 truncate text-[12px] text-slate-600">
                              {patient?.full_name || "No patient"}
                            </div>
                            <div className="mt-1 truncate text-[11px] text-slate-400">
                              Dr. {getDoctorName(appointment.doctor_id, doctors)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {viewMode === "list" ? (
          <>
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                <span>🗓️</span>
                Today — {formatDayHeading(new Date().toISOString())}
              </h2>

              <div className="premium-panel overflow-hidden">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 font-extrabold">Time</th>
                      <th className="px-3 py-3 font-extrabold">Patient</th>
                      <th className="px-3 py-3 font-extrabold">Doctor</th>
                      <th className="px-3 py-3 font-extrabold">Type</th>
                      <th className="px-3 py-3 font-extrabold">Priority</th>
                      <th className="px-3 py-3 font-extrabold">Status</th>
                      <th className="px-3 py-3 font-extrabold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {todayAppointments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-14 text-center text-sm font-semibold text-slate-400"
                        >
                          No records yet.
                        </td>
                      </tr>
                    ) : (
                      todayAppointments.map((appointment) => {
                        const patient = getPatient(appointment.patient_id, patients);

                        return (
                              <tr key={appointment.id}>
                            <td className="px-3 py-3 font-medium text-slate-700">
                              {formatTime(appointment.scheduled_at)}
                            </td>

                            <td className="px-3 py-3">
                              <div className="font-semibold text-slate-900">
                                {patient?.full_name || "—"}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {patient?.phone || "—"}
                              </div>
                            </td>

                            <td className="px-3 py-3 text-slate-700">
                              {getDoctorName(appointment.doctor_id, doctors)}
                            </td>

                            <td className="px-3 py-3 text-slate-700">
                              {prettyText(appointment.type)}
                            </td>

                            <td className="px-3 py-3 text-slate-700">
                              {prettyText(appointment.priority)}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ring-1 ${statusBadgeClass(
                                  appointment.status,
                                )}`}
                              >
                                {prettyText(appointment.status)}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <button
                                type="button"
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
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                <span>🗓️</span>
                Upcoming
              </h2>

              <div className="premium-panel overflow-hidden">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 font-extrabold">Date</th>
                      <th className="px-3 py-3 font-extrabold">Patient</th>
                      <th className="px-3 py-3 font-extrabold">Doctor</th>
                      <th className="px-3 py-3 font-extrabold">Type</th>
                      <th className="px-3 py-3 font-extrabold">Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {upcomingAppointments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-14 text-center text-sm font-semibold text-slate-400"
                        >
                          No records yet.
                        </td>
                      </tr>
                    ) : (
                      upcomingAppointments.map((appointment) => {
                        const patient = getPatient(appointment.patient_id, patients);

                        return (
                          <tr key={appointment.id}>
                            <td className="px-3 py-3 font-medium text-slate-700">
                              {formatDate(appointment.scheduled_at)}{" "}
                              <span className="text-slate-400">
                                {formatTime(appointment.scheduled_at)}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-slate-900">
                              {patient?.full_name || "—"}
                            </td>

                            <td className="px-3 py-3 text-slate-700">
                              {getDoctorName(appointment.doctor_id, doctors)}
                            </td>

                            <td className="px-3 py-3 text-slate-700">
                              {prettyText(appointment.type)}
                            </td>

                            <td className="px-3 py-3 text-slate-500">
                              {appointment.notes?.trim() || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
            <span>🧰</span>
            Scheduling Tools
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              className="premium-module-card"
            >
              <div className="mb-3 text-lg">🏥</div>
              <h3 className="text-[15px] font-extrabold text-slate-900">
                Patient Flow Board
              </h3>
              <p className="mt-2 text-[13px] text-slate-500">
                Real-time board showing patient status in clinic
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShowRecallModal(true)}
              className="premium-module-card"
            >
              <div className="mb-3 text-lg">🔔</div>
              <h3 className="text-[15px] font-extrabold text-slate-900">
                Recall Board
              </h3>
              <p className="mt-2 text-[13px] text-slate-500">
                Track patients who need follow-up recalls
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShowWaitlistModal(true)}
              className="premium-module-card"
            >
              <div className="mb-3 text-lg">⏳</div>
              <h3 className="text-[15px] font-extrabold text-slate-900">
                Waitlist Management
              </h3>
              <p className="mt-2 text-[13px] text-slate-500">
                Manage patients waiting for appointments
              </p>
            </button>

            <button
              type="button"
              className="premium-module-card"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-lg">🤖</span>
              </div>
              <h3 className="text-[15px] font-extrabold text-slate-900">
                Slot Suggestions
              </h3>
              <p className="mt-2 text-[13px] text-slate-500">
                Recommend best slots based on patient history
              </p>
            </button>
          </div>
        </section>
      </div>

      {showBookingModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-[650px] overflow-hidden rounded bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                <span>🗓️</span>
                Book Appointment
              </h2>

              <button
                type="button"
                onClick={closeBookingModal}
                className="text-xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div className="space-y-4 px-6 py-5">
                {formError ? (
                  <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {formError}
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                    Patient
                  </label>
                  <select
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                    className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name} · {patient.emr_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                      Time Slot
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(event) => setTimeSlot(event.target.value)}
                      className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                    Doctor
                  </label>
                  <select
                    value={doctorId}
                    onChange={(event) => setDoctorId(event.target.value)}
                    className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.full_name}
                        {doctor.qualification ? ` — ${doctor.qualification}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                      Appointment Type
                    </label>
                    <select
                      value={appointmentType}
                      onChange={(event) => setAppointmentType(event.target.value)}
                      className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                    >
                      <option value="regular">Regular Consultation</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="emergency">Emergency</option>
                      <option value="procedure">Procedure</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                      className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="routine">Routine</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-extrabold text-slate-500">
                    Reason / Chief Complaint
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-[95px] w-full rounded border border-slate-300 px-3 py-2 text-[14px] outline-none focus:border-[#0f8f83]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeBookingModal}
                  disabled={saving}
                  className="rounded border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-[#0f8f83] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-md hover:bg-[#0b7c72] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showRecallModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-6 backdrop-blur-sm">
          <div className="w-full max-w-[760px] overflow-hidden rounded bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                <span>🔔</span>
                Recall Board
              </h2>

              <button
                type="button"
                onClick={() => setShowRecallModal(false)}
                className="text-xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 font-extrabold">Patient</th>
                      <th className="px-4 py-3 font-extrabold">Reason</th>
                      <th className="px-4 py-3 font-extrabold">Due Date</th>
                      <th className="px-4 py-3 font-extrabold">Status</th>
                      <th className="px-4 py-3 font-extrabold">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm font-extrabold text-slate-500"
                      >
                        No records yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showWaitlistModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-6 backdrop-blur-sm">
          <div className="w-full max-w-[760px] overflow-hidden rounded bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                <span>⏳</span>
                Waitlist Management
              </h2>

              <button
                type="button"
                onClick={() => setShowWaitlistModal(false)}
                className="text-xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 font-extrabold">Patient</th>
                      <th className="px-4 py-3 font-extrabold">Doctor</th>
                      <th className="px-4 py-3 font-extrabold">Type</th>
                      <th className="px-4 py-3 font-extrabold">Added On</th>
                      <th className="px-4 py-3 font-extrabold">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm font-extrabold text-slate-500"
                      >
                        No records yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
