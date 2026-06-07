import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateEmrNumber } from "@/lib/emr";

type AssignBody = {
  doctor_id?: string;
  updates?: Partial<PatientPortalIntakeSubmission>;
};

type PatientPortalIntakeSubmission = {
  id: string;
  user_id: string | null;
  patient_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null;
  age: number | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  height_cm: number | null;
  blood_group: string | null;
  known_allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact: string | null;
  abha_id: string | null;
  abha_address: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature_f: number | null;
  spo2: number | null;
  weight_kg: number | null;
  chief_complaint: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { member, clinic } = await requireMember();
  if (member.role !== "medical_assistant" && member.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as AssignBody;
  const doctorId = body.doctor_id;

  if (!doctorId) {
    return NextResponse.json({ ok: false, error: "Doctor is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: rawSubmission, error: submissionError } = await admin
    .from("patient_portal_intake_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  let submission = rawSubmission as unknown as PatientPortalIntakeSubmission | null;

  if (submissionError || !submission) {
    return NextResponse.json(
      { ok: false, error: submissionError?.message || "Submission not found" },
      { status: 404 },
    );
  }

  if (body.updates) {
    const patch = sanitizeSubmissionUpdates(body.updates);
    if (Object.keys(patch).length > 0) {
      const { data: updatedSubmission, error: patchError } = await admin
        .from("patient_portal_intake_submissions")
        .update(patch as never)
        .eq("id", id)
        .select("*")
        .single();

      if (patchError || !updatedSubmission) {
        return NextResponse.json(
          { ok: false, error: patchError?.message || "Could not update patient details" },
          { status: 400 },
        );
      }

      submission = updatedSubmission as unknown as PatientPortalIntakeSubmission;
    }
  }

  const fullName = String(submission.full_name || "").trim();
  if (!fullName) {
    return NextResponse.json({ ok: false, error: "Patient full name is required" }, { status: 400 });
  }

  const patientId = submission.patient_id || null;
  let finalPatientId = patientId;

  if (!finalPatientId) {
    const emrNumber = await generateEmrNumber();
    const { data: createdPatient, error: patientError } = await admin
      .from("patients")
      .insert({
        doctor_id: doctorId,
        clinic_id: clinic.id,
        emr_number: emrNumber,
        first_name: submission.first_name,
        last_name: submission.last_name,
        full_name: fullName,
        birthdate: submission.birthdate,
        age: submission.age,
        sex: normalizeSex(submission.sex),
        phone: submission.phone,
        email: submission.email,
        address: submission.address,
        city: submission.city,
        state: submission.state,
        postal_code: submission.postal_code,
        country: submission.country,
        height_cm: submission.height_cm,
        blood_group: submission.blood_group,
        known_allergies: submission.known_allergies,
        chronic_conditions: submission.chronic_conditions,
        emergency_contact: submission.emergency_contact,
        abha_id: submission.abha_id,
        abha_address: submission.abha_address,
      } as never)
      .select("id")
      .single();

    if (patientError || !createdPatient) {
      const duplicatePatient = await findExistingPatient(admin, doctorId, fullName, submission.phone);
      if (duplicatePatient?.id) {
        finalPatientId = duplicatePatient.id;
      } else {
      return NextResponse.json(
        { ok: false, error: patientError?.message || "Could not create patient" },
        { status: 500 },
      );
      }
    } else {
      finalPatientId = (createdPatient as { id: string }).id;
    }
  }

  await admin
    .from("patients")
    .update({
      doctor_id: doctorId,
      clinic_id: clinic.id,
      first_name: submission.first_name,
      last_name: submission.last_name,
      full_name: fullName,
      birthdate: submission.birthdate,
      age: submission.age,
      sex: normalizeSex(submission.sex),
      phone: submission.phone,
      email: submission.email,
      address: submission.address,
      city: submission.city,
      state: submission.state,
      postal_code: submission.postal_code,
      country: submission.country,
      height_cm: submission.height_cm,
      blood_group: submission.blood_group,
      known_allergies: submission.known_allergies,
      chronic_conditions: submission.chronic_conditions,
      emergency_contact: submission.emergency_contact,
      abha_id: submission.abha_id,
      abha_address: submission.abha_address,
    } as never)
    .eq("id", finalPatientId);

  if (submission.user_id) {
    const linkPayload = {
      user_id: submission.user_id,
      patient_id: finalPatientId,
      clinic_id: clinic.id,
      status: "active",
    } as never;

    const { error: linkError } = await admin
      .from("patient_portal_accounts")
      .upsert(linkPayload, { onConflict: "user_id" });

    if (linkError) {
      await admin
        .from("patient_portal_accounts")
        .update({
          user_id: submission.user_id,
          clinic_id: clinic.id,
          status: "active",
        } as never)
        .eq("patient_id", finalPatientId);
    }
  }

  const { data: visit, error: visitError } = await admin
    .from("visits")
    .insert({
      patient_id: finalPatientId,
      doctor_id: doctorId,
      clinic_id: clinic.id,
      created_by: member.id,
      visit_date: new Date().toISOString(),
      status: "queued",
      bp_systolic: submission.bp_systolic,
      bp_diastolic: submission.bp_diastolic,
      pulse: submission.pulse,
      temperature_f: submission.temperature_f,
      spo2: submission.spo2,
      weight_kg: submission.weight_kg,
      chief_complaints: submission.chief_complaint,
    } as never)
    .select("id")
    .single();

  if (visitError || !visit) {
    return NextResponse.json(
      { ok: false, error: visitError?.message || "Could not create visit" },
      { status: 500 },
    );
  }

  const visitId = (visit as { id: string }).id;
  await admin.from("visit_doctors").insert({
    visit_id: visitId,
    doctor_id: doctorId,
    role: "attending",
  } as never);

  const { error: updateError } = await admin
    .from("patient_portal_intake_submissions")
    .update({
      status: "assigned",
      patient_id: finalPatientId,
      clinic_id: clinic.id,
      reviewed_by: member.id,
      reviewed_at: new Date().toISOString(),
      assigned_doctor_id: doctorId,
      created_patient_id: finalPatientId,
      created_visit_id: visitId,
    } as never)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, patientId: finalPatientId, visitId });
}

function normalizeSex(value: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "female" || normalized === "f") return "F";
  if (normalized === "male" || normalized === "m") return "M";
  if (normalized === "others" || normalized === "other" || normalized === "o") return "O";
  return null;
}

async function findExistingPatient(
  admin: ReturnType<typeof supabaseAdmin>,
  doctorId: string,
  fullName: string,
  phone: string | null,
) {
  let query = admin
    .from("patients")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("full_name", fullName)
    .limit(1);

  if (phone) {
    query = query.eq("phone", phone);
  }

  const { data } = await query.maybeSingle();
  return data as { id: string } | null;
}

function clean(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeSubmissionUpdates(updates: Partial<PatientPortalIntakeSubmission>) {
  return {
    first_name: clean(updates.first_name),
    last_name: clean(updates.last_name),
    full_name: clean(updates.full_name),
    birthdate: clean(updates.birthdate),
    age: numberOrNull(updates.age),
    sex: displaySex(normalizeSex(clean(updates.sex) as string | null)),
    phone: clean(updates.phone),
    email: clean(updates.email),
    address: clean(updates.address),
    city: clean(updates.city),
    state: clean(updates.state),
    postal_code: clean(updates.postal_code),
    country: clean(updates.country),
    height_cm: numberOrNull(updates.height_cm),
    blood_group: clean(updates.blood_group),
    known_allergies: clean(updates.known_allergies),
    chronic_conditions: clean(updates.chronic_conditions),
    emergency_contact: clean(updates.emergency_contact),
    abha_id: clean(updates.abha_id),
    abha_address: clean(updates.abha_address),
    bp_systolic: numberOrNull(updates.bp_systolic),
    bp_diastolic: numberOrNull(updates.bp_diastolic),
    pulse: numberOrNull(updates.pulse),
    temperature_f: numberOrNull(updates.temperature_f),
    spo2: numberOrNull(updates.spo2),
    weight_kg: numberOrNull(updates.weight_kg),
    chief_complaint: clean(updates.chief_complaint),
  };
}

function displaySex(value: string | null) {
  if (value === "F") return "Female";
  if (value === "M") return "Male";
  if (value === "O") return "Others";
  return null;
}
