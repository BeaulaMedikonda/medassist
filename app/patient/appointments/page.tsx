import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, PageHeader } from "@/components/patient/PatientCards";
import {
  ServerPagination,
  getPageFromParams,
  paginateServerItems,
  type SearchParamsRecord,
} from "@/components/ui/ServerPagination";
import type { Appointment, Doctor } from "@/types/db";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAppointmentDate(value: string) {
  const d = new Date(value);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  scheduled:  { label: "Scheduled",  color: "text-sky-700",     bg: "bg-sky-50 border-sky-200",     dot: "bg-sky-500" },
  confirmed:  { label: "Confirmed",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  completed:  { label: "Completed",  color: "text-slate-600",   bg: "bg-slate-100 border-slate-200", dot: "bg-slate-400" },
  cancelled:  { label: "Cancelled",  color: "text-rose-700",    bg: "bg-rose-50 border-rose-200",    dot: "bg-rose-500" },
  no_show:    { label: "No Show",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-500" },
  rescheduled:{ label: "Rescheduled",color: "text-violet-700",  bg: "bg-violet-50 border-violet-200",dot: "bg-violet-500" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low:      { label: "Low",      color: "text-slate-500" },
  normal:   { label: "Normal",   color: "text-sky-600" },
  high:     { label: "High",     color: "text-orange-600" },
  urgent:   { label: "Urgent",   color: "text-rose-600" },
  critical: { label: "Critical", color: "text-rose-700" },
};

function getStatus(status: string) {
  return STATUS_MAP[status] ?? { label: status, color: "text-slate-600", bg: "bg-slate-100 border-slate-200", dot: "bg-slate-400" };
}

function getPriority(priority: string) {
  return PRIORITY_MAP[priority] ?? { label: priority, color: "text-slate-500" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const { patient, clinic } = await requirePatient();
  const supabase = supabaseAdmin();

  const { data } = await supabase
    .from("appointments")
    .select("id, clinic_id, patient_id, doctor_id, scheduled_at, duration_minutes, type, priority, status, notes, created_by, created_at, updated_at")
    .eq("patient_id", patient.id)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  const appointments = (data || []) as Appointment[];
  const page = getPageFromParams(params);
  const pageData = paginateServerItems(appointments, page, 10);
  const doctorIds = Array.from(new Set(appointments.map((a) => a.doctor_id).filter(Boolean)));
  const { data: doctors } = doctorIds.length
    ? await supabase.from("doctors").select("id, full_name").in("id", doctorIds)
    : { data: [] };
  const doctorById = new Map(
    ((doctors || []) as Pick<Doctor, "id" | "full_name">[]).map((d) => [d.id, d.full_name]),
  );

  const upcomingAppointments = appointments
    .filter(
    (a) => new Date(a.scheduled_at) >= new Date() && a.status !== "cancelled",
    )
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const upcoming = upcomingAppointments.length;
  const nextAppointment = upcomingAppointments[0] || null;

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Appointments"
        title="My Appointments"
        description="Appointments are assigned by clinic staff. Contact your clinic to request changes."
      />

      {/* Summary chips */}
      {appointments.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {appointments.length} total
          </span>
          {upcoming > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] font-bold text-sky-700">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              {upcoming} upcoming
            </span>
          )}
        </div>
      )}

      {appointments.length === 0 ? (
        <EmptyState
          label="appointments"
          description="Your upcoming visits will appear here once your clinic schedules them."
        />
      ) : (
        <div className="space-y-3">
          {nextAppointment ? (
            <NextAppointmentCard
              appointment={nextAppointment}
              doctorName={doctorById.get(nextAppointment.doctor_id)}
            />
          ) : null}

          {pageData.pageItems.map((appt) => {
            const dt = formatAppointmentDate(appt.scheduled_at);
            const status = getStatus(appt.status);
            const priority = getPriority(appt.priority);
            const doctorName = doctorById.get(appt.doctor_id);
            const isPast = new Date(appt.scheduled_at) < new Date();

            return (
              <article
                key={appt.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_6px_18px_-10px_rgba(15,23,42,0.10)] transition ${
                  isPast ? "border-slate-200 opacity-80" : "border-slate-200 hover:border-[#0ea5a4]/30"
                }`}
              >
                <div className="flex items-stretch gap-0">
                  {/* Date column */}
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-slate-100 bg-slate-50 py-4 text-center">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{dt.month}</span>
                    <span className="mt-0.5 text-[26px] font-extrabold leading-none tracking-tight text-slate-900">{dt.day}</span>
                    <span className="mt-1 text-[10px] font-semibold text-slate-400">{dt.year}</span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-extrabold text-slate-900">{dt.full}</p>
                        <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
                          {dt.time}
                          {appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ""}
                          {doctorName ? ` · Dr. ${doctorName.split(" ")[0]}` : " · Clinic assigned"}
                        </p>
                      </div>

                      {/* Status pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.bg} ${status.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2">
                      {appt.type && (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
                          {appt.type.replace(/_/g, " ")}
                        </span>
                      )}
                      {appt.priority && appt.priority !== "normal" && (
                        <span className={`rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold ${priority.color}`}>
                          {priority.label} priority
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {appt.notes && (
                      <p className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-slate-600">
                        {appt.notes}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          <ServerPagination
            page={pageData.currentPage}
            pageSize={10}
            totalItems={appointments.length}
            searchParams={params}
            label="appointments"
          />
        </div>
      )}
    </PatientPortalShell>
  );
}

function NextAppointmentCard({
  appointment,
  doctorName,
}: {
  appointment: Appointment;
  doctorName?: string;
}) {
  const dt = formatAppointmentDate(appointment.scheduled_at);
  const status = getStatus(appointment.status);

  return (
    <section className="mb-5 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
            Next Appointment
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">
            {dt.full} at {dt.time}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {doctorName ? `Dr. ${doctorName}` : "Clinic assigned doctor"}
            {appointment.type ? ` - ${appointment.type.replace(/_/g, " ")}` : ""}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold ${status.bg} ${status.color}`}>
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>
      {appointment.notes ? (
        <p className="mt-4 rounded-xl border border-teal-100 bg-white/80 px-4 py-3 text-[13px] font-semibold text-slate-600">
          {appointment.notes}
        </p>
      ) : null}
    </section>
  );
}
