import { unstable_noStore as noStore } from "next/cache";
import { requireMember } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { MaDashboard } from "./MaDashboard";
import { DoctorDashboard } from "./DoctorDashboard";
import { AdminDashboard } from "./AdminDashboard";
import type { Doctor, Patient, Visit, Appointment } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  noStore();
  const { member, clinic } = await requireMember();
  const sb = await supabaseServer();

  // Today range (UTC-anchored is fine; clinic stats are coarse).
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);

  // ---- Today's clinic visits (broad fetch, then partition in JS) ----
  const { data: todayVisitsRaw } = await sb
    .from("visits")
    .select("*")
    .gte("visit_date", dayStart.toISOString())
    .lt("visit_date", dayEnd.toISOString())
    .order("visit_date", { ascending: false });
  const todayVisits = (todayVisitsRaw || []) as Visit[];

  // Awaiting-review visits across any date (drafts can stack up)
  const { data: awaitingRaw } = await sb
    .from("visits")
    .select("*")
    .eq("status", "awaiting_review")
    .order("updated_at", { ascending: false })
    .limit(50);
  const awaitingVisits = (awaitingRaw || []) as Visit[];

  // Hydrate patients for today + awaiting visits
  const patientIds = Array.from(
    new Set([...todayVisits, ...awaitingVisits].map((v) => v.patient_id)),
  );
  const { data: patientsRaw } =
    patientIds.length > 0
      ? await sb.from("patients").select("*").in("id", patientIds)
      : { data: [] as Patient[] };
  const patientById = new Map<string, Patient>();
  for (const p of (patientsRaw || []) as Patient[]) patientById.set(p.id, p);

  // Visit-doctor assignments for today + awaiting (used by MA & Doctor dashboards)
  const visitIds = Array.from(
    new Set([...todayVisits, ...awaitingVisits].map((v) => v.id)),
  );
  const { data: assignmentsRaw } =
    visitIds.length > 0
      ? await sb
          .from("visit_doctors")
          .select("visit_id, doctor_id, role")
          .in("visit_id", visitIds)
      : { data: [] as Array<{ visit_id: string; doctor_id: string; role: string }> };
  const assignments = (assignmentsRaw || []) as Array<{
    visit_id: string;
    doctor_id: string;
    role: string;
  }>;

  // Roster for the clinic (used by all roles)
  const { data: rosterRaw } = await sb
    .from("doctors")
    .select("id, full_name, qualification, role")
    .eq("clinic_id", clinic.id)
    .order("full_name");
  const roster = (rosterRaw || []) as Array<
    Pick<Doctor, "id" | "full_name" | "qualification" | "role">
  >;
  const doctorById = new Map(roster.map((r) => [r.id, r]));
  const doctorRoster = roster.filter((r) => r.role === "doctor");

  // Today's appointments (for all roles' calendar widgets)
  const { data: apptsRaw } = await sb
    .from("appointments")
    .select("*")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString())
    .order("scheduled_at");
  const todayAppointments = (apptsRaw || []) as Appointment[];

  if (member.role === "medical_assistant") {
    return (
      <MaDashboard
        member={member}
        clinic={clinic}
        todayVisits={todayVisits}
        awaitingVisits={awaitingVisits}
        patientById={Object.fromEntries(patientById)}
        assignments={assignments}
        doctorRoster={doctorRoster}
        currentUserId={member.id}
      />
    );
  }

  if (member.role === "doctor") {
    // Visits assigned to me
    const myVisitIds = new Set(
      assignments.filter((a) => a.doctor_id === member.id).map((a) => a.visit_id),
    );
    const myToday = todayVisits.filter(
      (v) => myVisitIds.has(v.id) || v.doctor_id === member.id || v.created_by === member.id,
    );
    const myAwaiting = awaitingVisits.filter(
      (v) => myVisitIds.has(v.id) || v.doctor_id === member.id,
    );
    const myAppts = todayAppointments.filter((a) => a.doctor_id === member.id);

    return (
      <DoctorDashboard
        member={member}
        clinic={clinic}
        myToday={myToday}
        myAwaiting={myAwaiting}
        patientById={Object.fromEntries(patientById)}
        myAppointments={myAppts}
      />
    );
  }

  // Admin
  // Counts
  const { count: totalPatients } = await sb
    .from("patients")
    .select("*", { count: "exact", head: true });
  const { data: monthlyDraftsRaw } = await sb
    .from("visits")
    .select("id, status, audio_url")
    .gte("visit_date", monthStart.toISOString())
    .not("audio_url", "is", null);

  return (
    <AdminDashboard
      member={member}
      clinic={clinic}
      todayVisits={todayVisits}
      awaitingVisits={awaitingVisits}
      patientById={Object.fromEntries(patientById)}
      assignments={assignments}
      doctorById={Object.fromEntries(doctorById)}
      roster={roster}
      todayAppointments={todayAppointments}
      totalPatients={totalPatients || 0}
      monthlyAiDrafts={(monthlyDraftsRaw || []).length}
    />
  );
}
