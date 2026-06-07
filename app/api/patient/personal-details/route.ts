import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PersonalDetailsBody = Record<string, unknown>;

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSex(value: unknown) {
  const normalized = clean(value)?.toLowerCase();
  if (normalized === "female" || normalized === "f") return "F";
  if (normalized === "male" || normalized === "m") return "M";
  if (normalized === "others" || normalized === "other" || normalized === "o") return "O";
  return null;
}

function displaySex(value: string | null) {
  if (value === "F") return "Female";
  if (value === "M") return "Male";
  if (value === "O") return "Others";
  return null;
}

export async function PUT(request: Request) {
  const { userId, patient, clinic } = await requirePatient();
  const body = (await request.json().catch(() => ({}))) as PersonalDetailsBody;
  const admin = supabaseAdmin();

  const profilePayload = {
    first_name: clean(body.first_name),
    last_name: clean(body.last_name),
    full_name: clean(body.full_name),
    birthdate: clean(body.birthdate),
    age: numberOrNull(body.age),
    sex: normalizeSex(body.sex),
    phone: clean(body.phone),
    email: clean(body.email),
    emergency_contact: clean(body.emergency_contact),
    address: clean(body.address),
    city: clean(body.city),
    state: clean(body.state),
    postal_code: clean(body.postal_code),
    country: clean(body.country),
    height_cm: numberOrNull(body.height_cm),
    blood_group: clean(body.blood_group),
    known_allergies: clean(body.known_allergies),
    chronic_conditions: clean(body.chronic_conditions),
    abha_id: clean(body.abha_id),
    abha_address: clean(body.abha_address),
  };

  const portalSubmissionPayload = {
    first_name: profilePayload.first_name,
    last_name: profilePayload.last_name,
    full_name: profilePayload.full_name,
    birthdate: profilePayload.birthdate,
    age: profilePayload.age,
    sex: clean(body.sex) || displaySex(profilePayload.sex),
    phone: profilePayload.phone,
    email: profilePayload.email,
    emergency_contact: profilePayload.emergency_contact,
    address: profilePayload.address,
    city: profilePayload.city,
    state: profilePayload.state,
    postal_code: profilePayload.postal_code,
    country: profilePayload.country,
    height_cm: profilePayload.height_cm,
    blood_group: profilePayload.blood_group,
    known_allergies: profilePayload.known_allergies,
    chronic_conditions: profilePayload.chronic_conditions,
    abha_id: profilePayload.abha_id,
    abha_address: profilePayload.abha_address,
  };

  if (!profilePayload.full_name || !profilePayload.phone) {
    return NextResponse.json(
      { ok: false, error: "Full name and phone are required." },
      { status: 400 },
    );
  }

  const isPendingPatient = patient.emr_number === "Pending clinic review" || !patient.doctor_id;
  const clinicId = await resolveClinicId(admin, userId, patient.id, clinic?.id || patient.clinic_id);

  if (isPendingPatient) {
    let registrationQuery = admin
      .from("patient_portal_registration_requests")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (clinicId) {
      registrationQuery = registrationQuery.eq("clinic_id", clinicId);
    }

    const { data: registrationForClinic } = await registrationQuery.maybeSingle();
    const registrationRequestId = (registrationForClinic as { id: string } | null)?.id || null;

    const intakePayload = {
      user_id: userId,
      clinic_id: clinicId,
      registration_request_id: registrationRequestId,
      ...portalSubmissionPayload,
      chief_complaint: clean(body.chief_complaint),
      bp_systolic: numberOrNull(body.bp_systolic),
      bp_diastolic: numberOrNull(body.bp_diastolic),
      pulse: numberOrNull(body.pulse),
      temperature_f: numberOrNull(body.temperature_f),
      spo2: numberOrNull(body.spo2),
      weight_kg: numberOrNull(body.weight_kg),
      status: "submitted",
    };

    let latestIntakeQuery = admin
      .from("patient_portal_intake_submissions")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (clinicId) {
      latestIntakeQuery = latestIntakeQuery.eq("clinic_id", clinicId);
    }

    const { data: latestIntake } = await latestIntakeQuery.maybeSingle();

    const intakeId = (latestIntake as { id: string } | null)?.id;
    const { error: intakeError } = intakeId
      ? await admin
          .from("patient_portal_intake_submissions")
          .update(intakePayload as never)
          .eq("id", intakeId)
      : await admin
          .from("patient_portal_intake_submissions")
          .insert(intakePayload as never);

    if (intakeError) {
      return NextResponse.json({ ok: false, error: intakeError.message }, { status: 400 });
    }

    let registrationUpdate = admin
      .from("patient_portal_registration_requests")
      .update({
        clinic_id: clinicId,
        full_name: profilePayload.full_name,
        phone: profilePayload.phone,
        email: profilePayload.email,
        address: profilePayload.address,
        status: "submitted",
      } as never)
      .eq("user_id", userId);

    if (clinicId) {
      registrationUpdate = registrationUpdate.eq("clinic_id", clinicId);
    }

    await registrationUpdate;

    return NextResponse.json({ ok: true });
  }

  const { error: patientError } = await admin
    .from("patients")
    .update(profilePayload as never)
    .eq("id", patient.id);

  if (patientError) {
    return NextResponse.json({ ok: false, error: patientError.message }, { status: 400 });
  }

  const submissionPayload = {
    user_id: userId,
    patient_id: patient.id,
    clinic_id: clinicId,
    ...portalSubmissionPayload,
    full_name: profilePayload.full_name,
    phone: profilePayload.phone,
    email: profilePayload.email,
    chief_complaint: clean(body.chief_complaint),
    bp_systolic: numberOrNull(body.bp_systolic),
    bp_diastolic: numberOrNull(body.bp_diastolic),
    pulse: numberOrNull(body.pulse),
    temperature_f: numberOrNull(body.temperature_f),
    spo2: numberOrNull(body.spo2),
    weight_kg: numberOrNull(body.weight_kg),
    status: "submitted",
  };

  const { error: submissionError } = await admin
    .from("patient_portal_intake_submissions")
    .insert(submissionPayload as never);

  if (submissionError) {
    return NextResponse.json({ ok: false, error: submissionError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return PUT(request);
}

async function resolveClinicId(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  patientId: string,
  currentClinicId: string | null,
) {
  if (currentClinicId) return currentClinicId;

  const { data: account } = await admin
    .from("patient_portal_accounts")
    .select("clinic_id")
    .eq("user_id", userId)
    .maybeSingle();
  const accountClinicId = (account as { clinic_id: string | null } | null)?.clinic_id;
  if (accountClinicId) return accountClinicId;

  const { data: patientRow } = await admin
    .from("patients")
    .select("clinic_id")
    .eq("id", patientId)
    .maybeSingle();
  const patientClinicId = (patientRow as { clinic_id: string | null } | null)?.clinic_id;
  if (patientClinicId) return patientClinicId;

  const { data } = await admin
    .from("clinics")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as { id: string } | null)?.id || null;
}
