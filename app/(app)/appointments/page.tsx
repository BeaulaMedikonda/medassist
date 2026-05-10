import { unstable_noStore as noStore } from "next/cache";
import { requireMember } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { parseLocalDate, isoLocalDate } from "@/lib/utils";
import { AppointmentsClient } from "./AppointmentsClient";
import type { Appointment, Doctor, Patient } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  noStore();
  const { member, clinic } = await requireMember();
  const sb = await supabaseServer();
  const resolvedSearchParams = await searchParams;
  const isDoctor = member.role === "doctor";

  // Anchor on selected day, then compute week bounds (Mon..Sun) so the
  // strip can render appointment counts for the whole visible week.
  const dayStart = resolvedSearchParams.date
    ? parseLocalDate(resolvedSearchParams.date)
    : (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      })();
  if (Number.isNaN(dayStart.getTime())) dayStart.setTime(Date.now());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const weekStart = new Date(dayStart);
  const dow = weekStart.getDay();
  const diff = (dow + 6) % 7; // Mon = 0
  weekStart.setDate(weekStart.getDate() - diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Whole-week pull (drives day view + week-strip counts). Doctor-scoped.
  let weekQuery = sb
    .from("appointments")
    .select("*")
    .gte("scheduled_at", weekStart.toISOString())
    .lt("scheduled_at", weekEnd.toISOString())
    .order("scheduled_at");
  if (isDoctor) weekQuery = weekQuery.eq("doctor_id", member.id);
  const { data: weekApptsRaw } = await weekQuery;
  const weekAppointments = (weekApptsRaw || []) as Appointment[];

  // Partition into day view + the rest of the week (used for week-strip badges).
  const dayAppointments = weekAppointments.filter((a) => {
    const t = new Date(a.scheduled_at).getTime();
    return t >= dayStart.getTime() && t < dayEnd.getTime();
  });

  // Build a per-day count map for the week strip.
  const counts: Record<string, number> = {};
  for (const a of weekAppointments) {
    const d = new Date(a.scheduled_at);
    const iso = isoLocalDate(d);
    counts[iso] = (counts[iso] || 0) + 1;
  }

  // Upcoming list — next 7 days starting from the day after `dayStart`,
  // also doctor-scoped if applicable.
  const horizonStart = dayEnd;
  const horizonEnd = new Date(dayEnd);
  horizonEnd.setDate(horizonEnd.getDate() + 7);
  let upcomingQuery = sb
    .from("appointments")
    .select("*")
    .gte("scheduled_at", horizonStart.toISOString())
    .lt("scheduled_at", horizonEnd.toISOString())
    .order("scheduled_at");
  if (isDoctor) upcomingQuery = upcomingQuery.eq("doctor_id", member.id);
  const { data: upcomingRaw } = await upcomingQuery;
  const upcoming = (upcomingRaw || []) as Appointment[];

  // Hydrate patients (across day + upcoming).
  const patientIds = Array.from(
    new Set(
      [...weekAppointments, ...upcoming]
        .map((a) => a.patient_id)
        .filter((x): x is string => x !== null),
    ),
  );
  const { data: patients } =
    patientIds.length > 0
      ? await sb.from("patients").select("*").in("id", patientIds)
      : { data: [] as Patient[] };

  // Roster — a doctor sees only themselves in the doctor selector.
  const { data: roster } = await sb
    .from("doctors")
    .select("id, full_name, qualification, role")
    .eq("clinic_id", clinic.id)
    .order("full_name");
  const allDoctors = ((roster as Array<
    Pick<Doctor, "id" | "full_name" | "qualification" | "role">
  >) || []).filter((d) => d.role === "doctor");
  const visibleDoctors = isDoctor
    ? allDoctors.filter((d) => d.id === member.id)
    : allDoctors;

  return (
    <AppointmentsClient
      currentUserId={member.id}
      clinicId={clinic.id}
      role={member.role}
      doctors={visibleDoctors}
      patients={(patients || []) as Patient[]}
      dayAppointments={dayAppointments}
      upcoming={upcoming}
      isoDate={isoLocalDate(dayStart)}
      weekCounts={counts}
    />
  );
}
