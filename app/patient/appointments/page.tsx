import { requirePatient } from "@/lib/auth-patient";
import { supabaseServer } from "@/lib/supabase/server";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, PageHeader } from "@/components/patient/PatientCards";
import {
  ServerPagination,
  getPageFromParams,
  paginateServerItems,
  type SearchParamsRecord,
} from "@/components/ui/ServerPagination";
import { formatDateTime } from "@/lib/utils";
import type { Appointment, Doctor } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const { patient, clinic } = await requirePatient();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("appointments")
    .select("id, clinic_id, patient_id, doctor_id, scheduled_at, duration_minutes, type, priority, status, notes, created_by, created_at, updated_at")
    .eq("patient_id", patient.id)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  const appointments = (data || []) as Appointment[];
  const page = getPageFromParams(params);
  const pageData = paginateServerItems(appointments, page, 10);
  const doctorIds = Array.from(new Set(appointments.map((item) => item.doctor_id).filter(Boolean)));
  const { data: doctors } = doctorIds.length
    ? await supabase.from("doctors").select("id, full_name").in("id", doctorIds)
    : { data: [] };
  const doctorById = new Map(((doctors || []) as Pick<Doctor, "id" | "full_name">[]).map((doctor) => [doctor.id, doctor.full_name]));

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Appointments"
        title="My Appointments"
        description="View appointments assigned by clinic staff. Doctor selection is intentionally not available in this portal."
      />

      {appointments.length === 0 ? (
        <EmptyState label="appointments" />
      ) : (
        <div className="space-y-3">
          {pageData.pageItems.map((appointment) => (
            <article key={appointment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    {formatDateTime(appointment.scheduled_at)}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Assigned doctor: {doctorById.get(appointment.doctor_id) || "Clinic assigned"}
                  </p>
                </div>
                <span className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-[#0c8a89]">
                  {appointment.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
                <div>Type: {appointment.type}</div>
                <div>Priority: {appointment.priority}</div>
                <div>Duration: {appointment.duration_minutes} mins</div>
              </div>
              {appointment.notes ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  {appointment.notes}
                </p>
              ) : null}
            </article>
          ))}
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
