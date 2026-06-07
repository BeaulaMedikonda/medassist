import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { AssignmentRole, Patient, Visit } from "@/types/db";

export const runtime = "nodejs";

type IntakeUpdateBody = {
  patientId?: string;
  patient?: Record<string, unknown>;
  visit?: Record<string, unknown>;
  assignments?: Array<{
    doctor_id?: string;
    role?: AssignmentRole;
  }>;
};

const ASSIGNMENT_ROLES = new Set<AssignmentRole>(["attending", "resident", "consultant"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ error: "Missing visit id" }, { status: 400 });
    }

    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: member } = await sb
      .from("doctors")
      .select("id, role, clinic_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!member) {
      const { data: legacyMember } = await sb
        .from("doctors")
        .select("id, role, clinic_id")
        .eq("id", user.id)
        .maybeSingle();
      member = legacyMember;
    }
    const clinicId = (member as { clinic_id?: string | null } | null)?.clinic_id;
    const role = (member as { role?: string } | null)?.role;

    if (!clinicId || (role !== "medical_assistant" && role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as IntakeUpdateBody;
    if (!body.patientId) {
      return NextResponse.json({ error: "Missing patient id" }, { status: 400 });
    }

    const [{ data: patient }, { data: visit }] = await Promise.all([
      sb.from("patients").select("id, clinic_id").eq("id", body.patientId).maybeSingle(),
      sb.from("visits").select("id, patient_id, clinic_id").eq("id", visitId).maybeSingle(),
    ]);

    if (!patient || !visit) {
      return NextResponse.json({ error: "Patient or visit not found" }, { status: 404 });
    }

    const p = patient as Pick<Patient, "id" | "clinic_id">;
    const v = visit as Pick<Visit, "id" | "patient_id" | "clinic_id">;
    if (p.clinic_id !== clinicId || v.clinic_id !== clinicId || v.patient_id !== p.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = normalizeAssignments(body.assignments);
    if (assignments.length === 0) {
      return NextResponse.json({ error: "Assign at least one doctor" }, { status: 400 });
    }

    const doctorIds = assignments.map((assignment) => assignment.doctor_id);
    const { data: clinicDoctors, error: doctorError } = await sb
      .from("doctors")
      .select("id")
      .eq("clinic_id", clinicId)
      .in("id", doctorIds);

    if (doctorError) {
      return NextResponse.json({ error: doctorError.message }, { status: 500 });
    }
    if (((clinicDoctors as Array<{ id: string }> | null) || []).length !== doctorIds.length) {
      return NextResponse.json({ error: "One or more assigned doctors are invalid" }, { status: 400 });
    }

    const patientUpdate = sanitizePatientUpdate(body.patient || {});
    const visitUpdate = {
      ...sanitizeVisitUpdate(body.visit || {}),
      doctor_id: assignments[0].doctor_id,
      // Advance from intake → queued now that a doctor has been assigned.
      status: "queued",
    };

    const admin = supabaseAdmin();
    const { error: patientError } = await admin
      .from("patients")
      .update(patientUpdate as never)
      .eq("id", p.id)
      .eq("clinic_id", clinicId);
    if (patientError) {
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    const { error: visitError } = await admin
      .from("visits")
      .update(visitUpdate as never)
      .eq("id", v.id)
      .eq("clinic_id", clinicId);
    if (visitError) {
      return NextResponse.json({ error: visitError.message }, { status: 500 });
    }

    const { error: deleteError } = await admin
      .from("visit_doctors")
      .delete()
      .eq("visit_id", v.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: assignmentError } = await admin.from("visit_doctors").insert(
      assignments.map((assignment) => ({
        visit_id: v.id,
        doctor_id: assignment.doctor_id,
        role: assignment.role,
      })) as never,
    );
    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save intake";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function normalizeAssignments(assignments: IntakeUpdateBody["assignments"]) {
  const seen = new Set<string>();
  return (assignments || []).flatMap((assignment) => {
    const doctorId = typeof assignment.doctor_id === "string" ? assignment.doctor_id : "";
    const role = assignment.role;
    if (!doctorId || !role || !ASSIGNMENT_ROLES.has(role) || seen.has(doctorId)) {
      return [];
    }
    seen.add(doctorId);
    return [{ doctor_id: doctorId, role }];
  });
}

function sanitizePatientUpdate(update: Record<string, unknown>) {
  return pick(update, [
    "first_name",
    "last_name",
    "full_name",
    "birthdate",
    "age",
    "sex",
    "blood_group",
    "height_cm",
    "phone",
    "email",
    "emergency_contact",
    "address",
    "city",
    "state",
    "postal_code",
    "country",
    "abha_id",
    "abha_address",
    "known_allergies",
    "chronic_conditions",
  ]);
}

function sanitizeVisitUpdate(update: Record<string, unknown>) {
  return pick(update, [
    "bp_systolic",
    "bp_diastolic",
    "pulse",
    "temperature_f",
    "spo2",
    "weight_kg",
    "chief_complaints",
  ]);
}

function pick(update: Record<string, unknown>, keys: string[]) {
  return keys.reduce<Record<string, unknown>>((picked, key) => {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      picked[key] = update[key];
    }
    return picked;
  }, {});
}
