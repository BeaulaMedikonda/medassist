import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Immunization, Patient, StaffRole, Visit } from "@/types/db";
 
export const runtime = "nodejs";
 
type CreateImmunizationBody = {
  patientId?: string;
  visitId?: string | null;
  vaccineName?: string;
  cvxCode?: string | null;
  dateGiven?: string;
  dose?: string | null;
  nextDueDate?: string | null;
  status?: Immunization["status"];
  notes?: string | null;
};
 
const STATUSES = new Set(["completed", "scheduled", "declined", "contraindicated"]);
 
export async function POST(req: Request) {
  try {
    const { member, clinic } = await requireMember();
    if (!["doctor", "medical_assistant", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
 
    const body = (await req.json().catch(() => ({}))) as CreateImmunizationBody;
    const patientId = body.patientId?.trim();
    let visitId = body.visitId?.trim() || null;
    const vaccineName = body.vaccineName?.trim();
    const dateGiven = body.dateGiven?.trim();
    const status = body.status || "completed";
 
    if (!patientId || !vaccineName || !dateGiven) {
      return NextResponse.json(
        { error: "Choose a patient, vaccine name, and date given." },
        { status: 400 },
      );
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid immunization status." }, { status: 400 });
    }
 
    const admin = supabaseAdmin();
    const { data: patient } = await admin
      .from("patients")
      .select("id, clinic_id")
      .eq("id", patientId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();
 
    if (!(patient as Pick<Patient, "id" | "clinic_id"> | null)) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
 
    if (visitId) {
      const { data: visit } = await admin
        .from("visits")
        .select("id, patient_id, clinic_id")
        .eq("id", visitId)
        .eq("patient_id", patientId)
        .eq("clinic_id", clinic.id)
        .maybeSingle();
 
      if (!(visit as Pick<Visit, "id" | "patient_id" | "clinic_id"> | null)) {
        return NextResponse.json({ error: "Visit not found" }, { status: 404 });
      }
    } else {
      const { data: activeVisit } = await admin
        .from("visits")
        .select("id")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinic.id)
        .in("status", ["queued", "intake", "in_progress", "awaiting_review"])
        .order("visit_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const resolvedActiveVisit = activeVisit as Pick<Visit, "id"> | null;
      if (resolvedActiveVisit?.id) {
        visitId = resolvedActiveVisit.id;
      } else {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: todayVisit } = await admin
          .from("visits")
          .select("id")
          .eq("patient_id", patientId)
          .eq("clinic_id", clinic.id)
          .gte("visit_date", dayStart.toISOString())
          .lt("visit_date", dayEnd.toISOString())
          .order("visit_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        visitId = (todayVisit as Pick<Visit, "id"> | null)?.id || null;
      }
    }
 
    const { data, error } = await admin
      .from("immunizations")
      .insert({
        patient_id: patientId,
        visit_id: visitId,
        clinic_id: clinic.id,
        vaccine_name: vaccineName,
        cvx_code: nullableText(body.cvxCode),
        date_given: dateGiven,
        dose: nullableText(body.dose),
        next_due_date: body.nextDueDate || null,
        status,
        notes: nullableText(body.notes),
        created_by: member.id,
        updated_by: member.id,
        created_role: member.role as StaffRole,
      } as never)
      .select("*")
      .single();
 
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
 
    return NextResponse.json({ ok: true, immunization: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
 
function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed : null;
}
 
 
