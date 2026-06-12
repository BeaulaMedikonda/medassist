"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";

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
  currentUserRole: string;
  doctors: DoctorRow[];
  patients: PatientRow[];
  appointments: AppointmentRow[];
  error: string | null;
};

const APPOINTMENTS_PAGE_SIZE = 8;

function todayInputValue() {
  return dateInputValue(new Date());
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
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

function timeSlotDate(dateValue: string, slotValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = slotValue.split(":").map(Number);
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function isPastSlot(dateValue: string, slotValue: string, now = new Date()) {
  return timeSlotDate(dateValue, slotValue).getTime() <= now.getTime();
}

function appointmentSlotValue(appointment: AppointmentRow) {
  const appointmentDate = new Date(appointment.scheduled_at);
  const hour = appointmentDate.getHours().toString().padStart(2, "0");
  const minute = appointmentDate.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function isSlotBooked(
  appointments: AppointmentRow[],
  dateValue: string,
  slotValue: string,
  doctorId: string,
) {
  if (!doctorId) return false;
  const targetDate = dateFromInput(dateValue);

  return appointments.some((appointment) => {
    if (appointment.doctor_id !== doctorId) return false;
    if (appointment.status === "cancelled" || appointment.status === "no_show") return false;
    return isSameDay(new Date(appointment.scheduled_at), targetDate) && appointmentSlotValue(appointment) === slotValue;
  });
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

function statToneClass(tone: "booked" | "waiting" | "done" | "open") {
  if (tone === "booked") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (tone === "waiting") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (tone === "done") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-cyan-50 text-cyan-700 ring-cyan-100";
}

export function AppointmentsClient({
  clinicId,
  clinicName,
  currentUserId,
  currentUserRole,
  doctors,
  patients,
  appointments,
  error,
}: Props) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"weekly" | "list">("list");
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const isDoctorView = currentUserRole === "doctor";
  const canBookAppointments = !isDoctorView;
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    isDoctorView ? currentUserId : "all",
  );
  const [todayPage, setTodayPage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);

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

  const selectedDateObject = dateFromInput(selectedDate);
  const todayStart = startOfToday();
  const weekDays = getCurrentWeekDays();

  const selectedDayAppointments = appointments.filter((appointment) => {
    const scheduled = new Date(appointment.scheduled_at);
    const doctorMatches =
      selectedDoctorId === "all" || appointment.doctor_id === selectedDoctorId;
    return doctorMatches && isSameDay(scheduled, selectedDateObject);
  });

  const upcomingAppointments = appointments.filter((appointment) => {
    const scheduled = new Date(appointment.scheduled_at);
    const doctorMatches =
      selectedDoctorId === "all" || appointment.doctor_id === selectedDoctorId;
    return doctorMatches && scheduled > new Date();
  });
  const todayPageData = getClientPageItems(selectedDayAppointments, todayPage, APPOINTMENTS_PAGE_SIZE);
  const upcomingPageData = getClientPageItems(upcomingAppointments, upcomingPage, APPOINTMENTS_PAGE_SIZE);

  const allTimeSlots = useMemo(
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
  const visibleTimeSlots = allTimeSlots.filter((slot) => !isPastSlot(selectedDate, slot.value));
  const defaultTimeSlot = visibleTimeSlots[0]?.value || "";
  const slotRows = visibleTimeSlots.map((slot) => {
    const bookedAppointments = selectedDayAppointments.filter((appointment) => {
      return appointmentSlotValue(appointment) === slot.value;
    });

    return { ...slot, appointments: bookedAppointments };
  });
  const bookedCount = selectedDayAppointments.length;
  const checkedInCount = selectedDayAppointments.filter((appointment) => appointment.status === "checked_in").length;
  const completedCount = selectedDayAppointments.filter((appointment) => appointment.status === "completed").length;
  const visibleSlotRows = isDoctorView
    ? slotRows.filter((slot) => slot.appointments.length > 0)
    : slotRows;
  const openSlotCount = canBookAppointments
    ? slotRows.filter((slot) => slot.appointments.length === 0).length
    : 0;
  const selectedDoctorName =
    selectedDoctorId === "all" ? "All doctors" : getDoctorName(selectedDoctorId, doctors);
  const bookableDoctors = isDoctorView
    ? doctors.filter((doctor) => doctor.id === currentUserId)
    : doctors;
  const modalTimeSlots = allTimeSlots.filter(
    (slot) =>
      !isPastSlot(date, slot.value) &&
      !isSlotBooked(appointments, date, slot.value, doctorId),
  );

  useEffect(() => {
    setTodayPage(1);
    setUpcomingPage(1);
  }, [selectedDate, selectedDoctorId]);

  useEffect(() => {
    if (!showBookingModal) return;
    if (modalTimeSlots.some((slot) => slot.value === timeSlot)) return;
    setTimeSlot(modalTimeSlots[0]?.value || "");
  }, [modalTimeSlots, showBookingModal, timeSlot]);

  function openBookingModal(slotValue = defaultTimeSlot) {
    if (!canBookAppointments) {
      setFormError("Doctors can only view their assigned appointments.");
      return;
    }

    const nextSlot = slotValue && !isPastSlot(selectedDate, slotValue) ? slotValue : defaultTimeSlot;
    if (!nextSlot) {
      setFormError("No appointment slots are available for the selected date.");
      return;
    }

    const nextDoctorId =
      isDoctorView
        ? currentUserId
        : selectedDoctorId === "all"
          ? bookableDoctors.find((doctor) => !isSlotBooked(appointments, selectedDate, nextSlot, doctor.id))?.id || ""
          : selectedDoctorId;

    if (!nextDoctorId) {
      setFormError("No doctors are available for this time slot.");
      return;
    }

    if (isSlotBooked(appointments, selectedDate, nextSlot, nextDoctorId)) {
      setFormError("This time slot is already booked for the selected doctor.");
      return;
    }

    setFormError(null);
    setPatientId(patients[0]?.id || "");
    setDoctorId(nextDoctorId);
    setDate(selectedDate);
    setTimeSlot(nextSlot);
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

    if (!canBookAppointments) {
      setFormError("Doctors can only view their assigned appointments.");
      return;
    }

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
      const scheduledAt = new Date(`${date}T${timeSlot}:00`);

      if (scheduledAt.getTime() <= Date.now()) {
        setFormError("Please choose a future time slot.");
        return;
      }

      if (isSlotBooked(appointments, date, timeSlot, doctorId)) {
        setFormError("This time slot is already booked for the selected doctor.");
        return;
      }

      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: 15,
          type: appointmentType,
          priority,
          notes,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        throw new Error(result.error || "Could not book appointment.");
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
        <section className="dashboard-hero rounded-[24px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#0f8f83]">
                Scheduling command center
              </p>
              <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-slate-950">
                Appointment Scheduling
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {selectedDoctorName} · {bookedCount} booked
                {canBookAppointments ? ` · ${openSlotCount} open slots` : ""}
              </p>
            </div>

            <div
              className={`grid gap-3 ${
                isDoctorView
                  ? "sm:grid-cols-[150px_auto] xl:min-w-[380px]"
                  : "sm:grid-cols-[150px_220px_auto] xl:min-w-[620px]"
              }`}
            >
              <label className="block">
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Date
                </span>
                <input
                  type="date"
                  min={todayInputValue()}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f8f83]"
                />
              </label>

              {!isDoctorView ? (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    Doctor
                  </span>
                  <select
                    value={selectedDoctorId}
                    onChange={(event) => setSelectedDoctorId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f8f83]"
                  >
                    <option value="all">All doctors</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="flex items-end gap-2">
                <button type="button" onClick={() => setShowRecallModal(true)} className="btn-secondary h-11">
                  Recall
                </button>
                <button type="button" onClick={() => setShowWaitlistModal(true)} className="btn-secondary h-11">
                  Waitlist
                </button>
                {canBookAppointments ? (
                  <button type="button" onClick={() => openBookingModal()} className="btn-teal h-11">
                    Book Appointment
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Booked", value: bookedCount, hint: "selected day", tone: "booked" as const },
            { label: "Checked in", value: checkedInCount, hint: "waiting in clinic", tone: "waiting" as const },
            { label: "Completed", value: completedCount, hint: "finished visits", tone: "done" as const },
            ...(canBookAppointments
              ? [{ label: "Open slots", value: openSlotCount, hint: "standard slots", tone: "open" as const }]
              : []),
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg p-4 ring-1 ${statToneClass(stat.tone)}`}>
              <div className="text-[12px] font-extrabold uppercase tracking-wide opacity-75">
                {stat.label}
              </div>
              <div className="mt-2 text-3xl font-black leading-none">{stat.value}</div>
              <div className="mt-1 text-[12px] font-semibold opacity-70">{stat.hint}</div>
            </div>
          ))}
        </section>

        {error ? (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {formError && !showBookingModal ? (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {formError}
          </div>
        ) : null}

        {viewMode === "weekly" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {weekDays.map((day) => {
              const dayAppointments = appointmentsForDate(appointments, day.date).filter(
                (appointment) =>
                  selectedDoctorId === "all" || appointment.doctor_id === selectedDoctorId,
              );

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
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Day Schedule
                  </h2>
                  <p className="text-[13px] font-medium text-slate-500">
                    Compact view of booked and available times for the selected day.
                  </p>
                </div>
              </div>

              <div className="premium-panel overflow-hidden">
                {visibleSlotRows.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="text-sm font-extrabold text-slate-700">
                      {isDoctorView ? "No appointments for this date." : "No remaining slots for this date."}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-slate-500">
                      {isDoctorView
                        ? "Select another date to view assigned appointments."
                        : "Select a future date to book a new appointment."}
                    </div>
                  </div>
                ) : visibleSlotRows.map((slot) => {
                  const firstAppointment = slot.appointments[0] || null;
                  const patient = firstAppointment
                    ? getPatient(firstAppointment.patient_id, patients)
                    : null;
                  const canBookSlot =
                    canBookAppointments && selectedDoctorId === "all"
                      ? bookableDoctors.some(
                          (doctor) => !isSlotBooked(appointments, selectedDate, slot.value, doctor.id),
                        )
                      : canBookAppointments && !isSlotBooked(appointments, selectedDate, slot.value, selectedDoctorId);

                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => canBookSlot ? openBookingModal(slot.value) : undefined}
                      disabled={!canBookSlot}
                      className={`grid w-full grid-cols-[92px_1fr_auto] items-center gap-4 border-b px-5 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${
                        !canBookSlot && !firstAppointment
                          ? "cursor-not-allowed border-slate-100 bg-slate-100/70 opacity-70"
                          : firstAppointment
                          ? "border-slate-100 bg-white"
                          : "border-slate-100 bg-slate-50/40"
                      }`}
                    >
                      <div>
                        <div className="text-[14px] font-black text-slate-950">
                          {slot.label}
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                          {firstAppointment ? `${firstAppointment.duration_minutes} min` : "Available"}
                        </div>
                      </div>

                      {firstAppointment ? (
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">
                            {patient?.full_name || "No patient"}
                          </div>
                          <div className="mt-1 truncate text-[12px] font-semibold text-slate-500">
                            Dr. {getDoctorName(firstAppointment.doctor_id, doctors)}
                            <span className="mx-1 text-slate-300">·</span>
                            {prettyText(firstAppointment.type)}
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0 text-sm font-semibold text-slate-500">
                          {canBookSlot ? "No booking in this slot" : "No doctor available"}
                        </div>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${
                          firstAppointment
                            ? statusBadgeClass(firstAppointment.status)
                            : "bg-white text-slate-500 ring-slate-200"
                        }`}
                      >
                        {firstAppointment ? prettyText(firstAppointment.status) : canBookSlot ? "Book" : "Full"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                Selected Day — {formatDayHeading(selectedDateObject.toISOString())}
              </h2>

              <div className="premium-panel overflow-x-auto">
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
                    {selectedDayAppointments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-12 text-center"
                        >
                          <div className="text-sm font-extrabold text-slate-700">
                            No appointments booked for this selection.
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-slate-500">
                            Use the slot board above or book a walk-in appointment.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      todayPageData.pageItems.map((appointment) => {
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
                                onClick={() =>
                                  appointment.patient_id
                                    ? router.push(`/emr/${appointment.patient_id}`)
                                    : undefined
                                }
                                disabled={!appointment.patient_id}
                                className="premium-action disabled:cursor-not-allowed disabled:opacity-40"
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
                <ClientPagination
                  page={todayPageData.currentPage}
                  pageSize={APPOINTMENTS_PAGE_SIZE}
                  totalItems={selectedDayAppointments.length}
                  onPageChange={setTodayPage}
                  label="appointments"
                />
              </div>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
                Upcoming
              </h2>

              <div className="premium-panel overflow-x-auto">
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
                          className="px-3 py-12 text-center"
                        >
                          <div className="text-sm font-extrabold text-slate-700">
                            No upcoming appointments found.
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-slate-500">
                            Future bookings for the selected doctor will appear here.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      upcomingPageData.pageItems.map((appointment) => {
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
                <ClientPagination
                  page={upcomingPageData.currentPage}
                  pageSize={APPOINTMENTS_PAGE_SIZE}
                  totalItems={upcomingAppointments.length}
                  onPageChange={setUpcomingPage}
                  label="appointments"
                />
              </div>
            </section>
          </>
        ) : null}

        <section className="hidden">
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
            Scheduling Tools
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              className="premium-module-card"
            >
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

      {showBookingModal && canBookAppointments ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-[650px] overflow-hidden rounded bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-slate-900">
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
                      min={todayInputValue()}
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
                      {modalTimeSlots.length === 0 ? (
                        <option value="">No available slots</option>
                      ) : null}
                      {modalTimeSlots.map((slot) => (
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
                    disabled={isDoctorView}
                    className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#0f8f83]"
                  >
                    <option value="">Select doctor</option>
                    {bookableDoctors.map((doctor) => (
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
                  disabled={saving || modalTimeSlots.length === 0}
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
