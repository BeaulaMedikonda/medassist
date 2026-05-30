import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateEmrNumber } from "@/lib/emr";

export const runtime = "nodejs";

type AssignmentInput = {
  doctor_id: string;
  role: "attending" | "resident" | "consultant";
  appt_time?: string;
};

type IntakePayload = {
  patient: Record<string, unknown>;
  vitals?: Record<string, unknown>;
  chiefComplaint?: string | null;
  assignments?: AssignmentInput[];
  apptDate?: string;
  route?: boolean;
};

export async function POST(req: Request) {
  try {
    const { member, clinic } = await requireMember();
    if (member.role !== "medical_assistant" && member.role !== "admin" && member.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as IntakePayload;
    const patient = body.patient || {};
    const fullName = String(patient.full_name || "").trim();
    if (!fullName) {
      return NextResponse.json({ error: "Patient full name is required" }, { status: 400 });
    }

    const assignments = body.assignments || [];
    if (body.route && assignments.length === 0) {
      return NextResponse.json({ error: "Pick at least one doctor" }, { status: 400 });
    }

    const primaryDoctorId = assignments[0]?.doctor_id || member.id;
    const emrNumber = await generateEmrNumber();
    const admin = supabaseAdmin();

    const { data: createdPatient, error: patientError } = await admin
      .from("patients")
      .insert({
        ...patient,
        doctor_id: primaryDoctorId,
        clinic_id: clinic.id,
        emr_number: emrNumber,
        full_name: fullName,
      } as never)
      .select("id")
      .single();
    if (patientError || !createdPatient) {
      return NextResponse.json(
        { error: patientError?.message || "Could not create patient" },
        { status: 500 },
      );
    }

    const patientId = (createdPatient as { id: string }).id;
    const vitals = body.vitals || {};
    const { data: visit, error: visitError } = await admin
      .from("visits")
      .insert({
        patient_id: patientId,
        doctor_id: primaryDoctorId,
        clinic_id: clinic.id,
        created_by: member.id,
        visit_date: new Date().toISOString(),
        status: body.route ? "queued" : "intake",
        bp_systolic: vitals.bp_systolic ?? null,
        bp_diastolic: vitals.bp_diastolic ?? null,
        pulse: vitals.pulse ?? null,
        temperature_f: vitals.temperature_f ?? null,
        spo2: vitals.spo2 ?? null,
        weight_kg: vitals.weight_kg ?? null,
        chief_complaints: body.chiefComplaint || null,
      } as never)
      .select("id")
      .single();
    if (visitError || !visit) {
      return NextResponse.json(
        { error: visitError?.message || "Could not create visit" },
        { status: 500 },
      );
    }

    const visitId = (visit as { id: string }).id;
    if (body.route && assignments.length > 0) {
      const { error: assignmentError } = await admin.from("visit_doctors").insert(
        assignments.map((assignment) => ({
          visit_id: visitId,
          doctor_id: assignment.doctor_id,
          role: assignment.role,
        })) as never,
      );
      if (assignmentError) {
        return NextResponse.json({ error: assignmentError.message }, { status: 500 });
      }

      const apptRows = assignments
        .filter((assignment) => assignment.appt_time)
        .map((assignment) => ({
          clinic_id: clinic.id,
          patient_id: patientId,
          doctor_id: assignment.doctor_id,
          scheduled_at: new Date(`${body.apptDate}T${assignment.appt_time}:00`).toISOString(),
          duration_minutes: 15,
          type: "regular",
          priority: "normal",
          status: "scheduled",
          notes: body.chiefComplaint || null,
          created_by: member.id,
        }));

      if (apptRows.length > 0) {
        const { error: appointmentError } = await admin
          .from("appointments")
          .insert(apptRows as never);
        if (appointmentError) {
          return NextResponse.json({ error: appointmentError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, patientId, visitId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
