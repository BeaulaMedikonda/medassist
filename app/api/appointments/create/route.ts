import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Appointment, Doctor, Patient } from "@/types/db";
 
export const runtime = "nodejs";
 
type CreateAppointmentBody = {
  patientId?: string;
  doctorId?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  type?: string;
  priority?: string;
  notes?: string | null;
};
 
export async function POST(req: Request) {
  try {
    const { member, clinic } = await requireMember();
    if (!["doctor", "medical_assistant", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (member.role === "doctor") {
      return NextResponse.json({ error: "Doctors can only view their assigned appointments." }, { status: 403 });
    }
 
    const body = (await req.json().catch(() => ({}))) as CreateAppointmentBody;
    const patientId = body.patientId?.trim();
    const doctorId = body.doctorId?.trim();
    const scheduledAt = body.scheduledAt?.trim();
 
    if (!patientId || !doctorId || !scheduledAt) {
      return NextResponse.json({ error: "Patient, doctor and time are required." }, { status: 400 });
    }
 
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Please choose a future time slot." }, { status: 400 });
    }
 
    const admin = supabaseAdmin();
    const [{ data: patient }, { data: doctor }] = await Promise.all([
      admin
        .from("patients")
        .select("id, clinic_id")
        .eq("id", patientId)
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
      admin
        .from("doctors")
        .select("id, clinic_id, role")
        .eq("id", doctorId)
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
    ]);
 
    if (!(patient as Pick<Patient, "id" | "clinic_id"> | null)) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }
    if (!(doctor as Pick<Doctor, "id" | "clinic_id" | "role"> | null)) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }
    const { data: existing } = await admin
      .from("appointments")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("doctor_id", doctorId)
      .eq("scheduled_at", scheduledDate.toISOString())
      .not("status", "in", "(cancelled,no_show)")
      .limit(1)
      .maybeSingle();
 
    if (existing) {
      return NextResponse.json({ error: "This time slot is already booked for the selected doctor." }, { status: 409 });
    }
 
    const { data, error } = await admin
      .from("appointments")
      .insert({
        clinic_id: clinic.id,
        patient_id: patientId,
        doctor_id: doctorId,
        scheduled_at: scheduledDate.toISOString(),
        duration_minutes: body.durationMinutes || 15,
        type: body.type || "regular",
        priority: body.priority || "normal",
        status: "scheduled",
        notes: body.notes?.trim() || null,
        created_by: member.id,
      } as never)
      .select("*")
      .single();
 
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
 
    return NextResponse.json({ ok: true, appointment: data as Appointment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
 
 