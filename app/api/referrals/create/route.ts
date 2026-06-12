import { NextResponse } from "next/server";
import { getOptionalMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Doctor, Patient, Visit } from "@/types/db";

export const runtime = "nodejs";

type CreateReferralBody = {
  patientId?: string;
  visitId?: string | null;
  referredToDoctorId?: string | null;
  referredToName?: string;
  specialty?: string;
  reason?: string;
  notes?: string | null;
};

export async function POST(req: Request) {
  const auth = await getOptionalMember();
  if (!auth?.member || !auth.clinic) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = auth.member;
  if (member.role !== "doctor" && member.role !== "admin") {
    return NextResponse.json(
      { error: "Only doctors or admins can create referrals" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as CreateReferralBody;
  const patientId = body.patientId?.trim();
  const visitId = body.visitId?.trim() || null;
  const referredToDoctorId = body.referredToDoctorId?.trim() || null;
  const referredToName = body.referredToName?.trim() || "";
  const specialty = body.specialty?.trim() || "";
  const reason = body.reason?.trim() || "";
  const notes = body.notes?.trim() || null;

  if (!patientId || !referredToName || !specialty || !reason) {
    return NextResponse.json(
      { error: "Patient, referred doctor, specialty and reason are required" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();
  const { data: patient } = await admin
    .from("patients")
    .select("id, clinic_id")
    .eq("id", patientId)
    .eq("clinic_id", auth.clinic.id)
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
      .eq("clinic_id", auth.clinic.id)
      .maybeSingle();

    if (!(visit as Pick<Visit, "id" | "patient_id" | "clinic_id"> | null)) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
  }

  if (referredToDoctorId) {
    if (referredToDoctorId === member.id) {
      return NextResponse.json(
        { error: "You cannot refer a patient to yourself" },
        { status: 400 },
      );
    }

    const { data: referredDoctor } = await admin
      .from("doctors")
      .select("id, clinic_id, role")
      .eq("id", referredToDoctorId)
      .eq("clinic_id", auth.clinic.id)
      .maybeSingle();
    const doctor = referredDoctor as Pick<Doctor, "id" | "clinic_id" | "role"> | null;

    if (!doctor || doctor.role !== "doctor") {
      return NextResponse.json(
        { error: "Referred doctor is not available in this clinic" },
        { status: 400 },
      );
    }
  }

  const { data: referral, error } = await admin
    .from("referrals")
    .insert({
      clinic_id: auth.clinic.id,
      patient_id: patientId,
      visit_id: visitId,
      referring_doctor_id: member.id,
      referred_to_doctor_id: referredToDoctorId,
      referred_to_name: referredToName,
      referred_to_specialty: specialty,
      reason,
      notes,
      status: "sent",
      created_by: member.id,
    } as never)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, referral });
}
