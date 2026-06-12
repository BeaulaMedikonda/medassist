import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/auth-patient";
import { hasSupabaseAdminEnv } from "@/lib/env";
import { PATIENT_DEMO_PROFILE_COOKIE, patientDemoProfileKey } from "@/lib/patient-session";
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
  const isDemoUser = userId.startsWith("patient-demo-") || !validUuid(userId);
  const isRealPatient = validUuid(patient.id);
 
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
 
  if (isDemoUser || patient.emr_number === "Mobile OTP login") {
    const clinicId = validUuid(clinic?.id || patient.clinic_id) ? clinic?.id || patient.clinic_id : null;
    if (hasSupabaseAdminEnv) {
      const admin = supabaseAdmin();
      const painMarkers = Array.isArray(body.pain_markers) && (body.pain_markers as unknown[]).length > 0
        ? body.pain_markers
        : null;
      const intakePayload = {
        user_id: null,
        patient_id: null,
        clinic_id: clinicId,
        ...portalSubmissionPayload,
        chief_complaint: clean(body.chief_complaint),
        bp_systolic: numberOrNull(body.bp_systolic),
        bp_diastolic: numberOrNull(body.bp_diastolic),
        pulse: numberOrNull(body.pulse),
        temperature_f: numberOrNull(body.temperature_f),
        spo2: numberOrNull(body.spo2),
        weight_kg: numberOrNull(body.weight_kg),
        pain_markers: painMarkers,
        pain_intensity: painMarkers ? numberOrNull(body.pain_intensity) : null,
        pain_type: painMarkers ? clean(body.pain_type) : null,
        pain_summary: painMarkers ? clean(body.pain_summary) : null,
        status: "submitted",
      };
 
      let existingQuery = admin
        .from("patient_portal_intake_submissions")
        .select("id")
        .eq("phone", profilePayload.phone)
        .order("created_at", { ascending: false })
        .limit(1);
 
      existingQuery = clinicId
        ? existingQuery.eq("clinic_id", clinicId)
        : existingQuery.is("clinic_id", null);
 
      const { data: existingSubmission } = await existingQuery.maybeSingle();
      const existingId = (existingSubmission as { id: string } | null)?.id;
 
      const { error } = existingId
        ? await admin
            .from("patient_portal_intake_submissions")
            .update(intakePayload as never)
            .eq("id", existingId)
        : await admin
            .from("patient_portal_intake_submissions")
            .insert(intakePayload as never);
 
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
    }
 
    const response = NextResponse.json({ ok: true, temporary: true });
    response.cookies.set({
      name: PATIENT_DEMO_PROFILE_COOKIE,
      value: encodeURIComponent(
        JSON.stringify(
          mergeDemoProfile(
            request.headers.get("cookie") || "",
            patientDemoProfileKey(clinic?.id || patient.clinic_id || clinicId, profilePayload.phone),
            profilePayload,
          ),
        ),
      ),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return response;
  }
 
  const admin = supabaseAdmin();
  const isPendingPatient = patient.emr_number === "Pending clinic review" || !patient.doctor_id;
  const clinicId = await resolveClinicId(admin, userId, patient.id, clinic?.id || patient.clinic_id);
 
  if (isPendingPatient) {
    const pendingPainMarkers = Array.isArray(body.pain_markers) && (body.pain_markers as unknown[]).length > 0
      ? body.pain_markers
      : null;
    const intakePayload = {
      user_id: validUuid(userId) ? userId : null,
      clinic_id: clinicId,
      ...portalSubmissionPayload,
      chief_complaint: clean(body.chief_complaint),
      bp_systolic: numberOrNull(body.bp_systolic),
      bp_diastolic: numberOrNull(body.bp_diastolic),
      pulse: numberOrNull(body.pulse),
      temperature_f: numberOrNull(body.temperature_f),
      spo2: numberOrNull(body.spo2),
      weight_kg: numberOrNull(body.weight_kg),
      pain_markers: pendingPainMarkers,
      pain_intensity: pendingPainMarkers ? numberOrNull(body.pain_intensity) : null,
      pain_type: pendingPainMarkers ? clean(body.pain_type) : null,
      pain_summary: pendingPainMarkers ? clean(body.pain_summary) : null,
      status: "submitted",
    };
 
    let latestIntakeQuery = admin
      .from("patient_portal_intake_submissions")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);
 
    latestIntakeQuery = validUuid(userId)
      ? latestIntakeQuery.eq("user_id", userId)
      : latestIntakeQuery.eq("phone", profilePayload.phone);
 
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
 
    return NextResponse.json({ ok: true });
  }
 
  const { error: patientError } = await admin
    .from("patients")
    .update(profilePayload as never)
    .eq("id", patient.id);
 
  if (patientError) {
    return NextResponse.json({ ok: false, error: patientError.message }, { status: 400 });
  }
 
  const activePainMarkers = Array.isArray(body.pain_markers) && (body.pain_markers as unknown[]).length > 0
    ? body.pain_markers
    : null;
  const submissionPayload = {
    user_id: validUuid(userId) ? userId : null,
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
    pain_markers: activePainMarkers,
    pain_intensity: activePainMarkers ? numberOrNull(body.pain_intensity) : null,
    pain_type: activePainMarkers ? clean(body.pain_type) : null,
    pain_summary: activePainMarkers ? clean(body.pain_summary) : null,
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
 
function mergeDemoProfile(cookieHeader: string, key: string, profile: Record<string, unknown>) {
  const existingValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PATIENT_DEMO_PROFILE_COOKIE}=`))
    ?.slice(PATIENT_DEMO_PROFILE_COOKIE.length + 1);
 
  let existing: Record<string, unknown> = {};
  if (existingValue) {
    try {
      const parsed = JSON.parse(decodeURIComponent(existingValue)) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        existing = parsed;
      }
    } catch {
      existing = {};
    }
  }
 
  return {
    ...existing,
    [key]: profile,
  };
}
 
function validUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
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
 
  if (validUuid(userId)) {
    const { data: account } = await admin
      .from("patient_portal_accounts")
      .select("clinic_id")
      .eq("user_id", userId)
      .maybeSingle();
    const accountClinicId = (account as { clinic_id: string | null } | null)?.clinic_id;
    if (accountClinicId) return accountClinicId;
  }
 
  if (validUuid(patientId)) {
    const { data: patientRow } = await admin
      .from("patients")
      .select("clinic_id")
      .eq("id", patientId)
      .maybeSingle();
    const patientClinicId = (patientRow as { clinic_id: string | null } | null)?.clinic_id;
    if (patientClinicId) return patientClinicId;
  }
 
  const { data } = await admin
    .from("clinics")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
 
  return (data as { id: string } | null)?.id || null;
}
 
 