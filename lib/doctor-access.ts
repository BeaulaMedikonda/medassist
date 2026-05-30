import type { SupabaseClient } from "@supabase/supabase-js";
import type { Visit } from "@/types/db";

type AssignedVisit = Pick<Visit, "id" | "patient_id" | "doctor_id">;

export async function getDoctorAssignedScope(
  supabase: SupabaseClient,
  doctorId: string,
  clinicId: string,
) {
  const [{ data: directRows }, { data: assignmentRows }, { data: referralRows }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, patient_id, doctor_id")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId),
    supabase
      .from("visit_doctors")
      .select("visit_id")
      .eq("doctor_id", doctorId),
    supabase
      .from("referrals")
      .select("patient_id")
      .eq("clinic_id", clinicId)
      .eq("referred_to_doctor_id", doctorId),
  ]);

  const visitMap = new Map<string, AssignedVisit>();
  for (const visit of (directRows || []) as AssignedVisit[]) {
    visitMap.set(visit.id, visit);
  }

  const assignedVisitIds = Array.from(
    new Set(
      ((assignmentRows || []) as Array<{ visit_id: string | null }>)
        .map((row) => row.visit_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (assignedVisitIds.length > 0) {
    const { data: assignedRows } = await supabase
      .from("visits")
      .select("id, patient_id, doctor_id")
      .eq("clinic_id", clinicId)
      .in("id", assignedVisitIds);

    for (const visit of (assignedRows || []) as AssignedVisit[]) {
      visitMap.set(visit.id, visit);
    }
  }

  const referredPatientIds = Array.from(
    new Set(
      ((referralRows || []) as Array<{ patient_id: string | null }>)
        .map((row) => row.patient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (referredPatientIds.length > 0) {
    const { data: referredRows } = await supabase
      .from("visits")
      .select("id, patient_id, doctor_id")
      .eq("clinic_id", clinicId)
      .in("patient_id", referredPatientIds);

    for (const visit of (referredRows || []) as AssignedVisit[]) {
      visitMap.set(visit.id, visit);
    }
  }

  const visitIds = new Set(visitMap.keys());
  const patientIds = new Set([
    ...Array.from(visitMap.values()).map((visit) => visit.patient_id),
    ...referredPatientIds,
  ]);

  return { visitIds, patientIds };
}

export async function doctorCanAccessPatient(
  supabase: SupabaseClient,
  doctorId: string,
  clinicId: string,
  patientId: string,
) {
  const { patientIds } = await getDoctorAssignedScope(supabase, doctorId, clinicId);
  return patientIds.has(patientId);
}

export async function doctorCanAccessVisit(
  supabase: SupabaseClient,
  doctorId: string,
  clinicId: string,
  visitId: string,
) {
  const { visitIds } = await getDoctorAssignedScope(supabase, doctorId, clinicId);
  return visitIds.has(visitId);
}
