import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Clinic, Patient } from "@/types/db";

const PATIENT_SELECTED_CLINIC_COOKIE = "patient_selected_clinic_id";
const PATIENT_SELECTED_CLINIC_NAME_COOKIE = "patient_selected_clinic_name";

export type PatientSession = {
  userId: string;
  email: string;
  patient: Patient;
  clinic: Clinic | null;
};

type PortalRegistration = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  clinic_id: string | null;
};

type PortalIntake = {
  id: string;
  patient_id: string | null;
  created_patient_id: string | null;
  clinic_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
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
};

export async function requirePatient(): Promise<PatientSession> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/patient/login");

  const admin = supabaseAdmin();
  const cookieStore = await cookies();
  const selectedClinicId = cookieStore.get(PATIENT_SELECTED_CLINIC_COOKIE)?.value || null;
  const selectedClinicName = cookieStore.get(PATIENT_SELECTED_CLINIC_NAME_COOKIE)?.value || null;
  const notLinkedHref = patientLoginHref(selectedClinicId, selectedClinicName, "not-linked");

  let patientAccountQuery = supabase
    .from("patient_portal_accounts")
    .select("patient_id, clinic_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (selectedClinicId) {
    patientAccountQuery = patientAccountQuery.eq("clinic_id", selectedClinicId);
  }

  const { data: patientUser } = await patientAccountQuery.maybeSingle();

  let linkedPatientId = patientUser?.patient_id || null;
  let linkedClinicId = patientUser?.clinic_id || null;

  if (!linkedPatientId) {
    let existingAccountQuery = admin
      .from("patient_portal_accounts")
      .select("patient_id, clinic_id")
      .eq("user_id", user.id);

    if (selectedClinicId) {
      existingAccountQuery = existingAccountQuery.eq("clinic_id", selectedClinicId);
    }

    const { data: existingAccount } = await existingAccountQuery.maybeSingle();
    const existingAccountRow = existingAccount as { patient_id: string | null; clinic_id: string | null } | null;

    if (existingAccountRow?.patient_id) {
      linkedPatientId = existingAccountRow.patient_id;
      linkedClinicId = existingAccountRow.clinic_id;
      await admin
        .from("patient_portal_accounts")
        .update({ status: "active" } as never)
        .eq("user_id", user.id);
    }
  }

  if (!linkedPatientId) {
    const existingPatient = await findExistingPatientForPortalUser(
      admin,
      user.id,
      user.email || null,
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
      selectedClinicId,
    );

    if (existingPatient) {
      await linkPortalAccount(admin, user.id, existingPatient);
      linkedPatientId = existingPatient.id;
      linkedClinicId = existingPatient.clinic_id;
    }
  }

  if (!linkedPatientId) {
    const pendingPatient = await buildPendingPortalPatient(
      admin,
      user.id,
      user.email || "",
      selectedClinicId,
    );
    if (pendingPatient) {
      return {
        userId: user.id,
        email: user.email || "",
        patient: pendingPatient.patient,
        clinic: pendingPatient.clinic,
      };
    }

    redirect(notLinkedHref);
  }

  const { data: patient } = await admin
    .from("patients")
    .select("*")
    .eq("id", linkedPatientId)
    .maybeSingle();

  if (!patient) redirect("/patient/login?error=not-linked");

  const patientRow = patient as Patient;

  const clinicId = linkedClinicId || patientRow.clinic_id;
  if (selectedClinicId && clinicId !== selectedClinicId) {
    redirect(notLinkedHref);
  }

  let clinic: Clinic | null = null;

  if (clinicId) {
    const { data: clinicRow } = await admin
      .from("clinics")
      .select("*")
      .eq("id", clinicId)
      .maybeSingle();
    clinic = (clinicRow as Clinic | null) || null;
  }

  return {
    userId: user.id,
    email: user.email || "",
    patient: patientRow,
    clinic,
  };
}

function patientLoginHref(
  clinicId: string | null,
  clinicName: string | null,
  error: string,
) {
  const params = new URLSearchParams({ error });
  if (clinicId) params.set("clinic", clinicId);
  if (clinicName) params.set("clinicName", clinicName);
  return `/patient/login?${params.toString()}`;
}

async function buildPendingPortalPatient(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  userEmail: string,
  selectedClinicId: string | null,
): Promise<{ patient: Patient; clinic: Clinic | null } | null> {
  let intakeQuery = admin
    .from("patient_portal_intake_submissions")
    .select("id, patient_id, created_patient_id, clinic_id, first_name, last_name, full_name, birthdate, age, sex, phone, email, address, city, state, postal_code, country, height_cm, blood_group, known_allergies, chronic_conditions, emergency_contact, abha_id, abha_address")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selectedClinicId) {
    intakeQuery = intakeQuery.eq("clinic_id", selectedClinicId);
  }

  const { data: intake } = await intakeQuery.maybeSingle();

  const intakeRow = intake as PortalIntake | null;

  if (intakeRow?.patient_id || intakeRow?.created_patient_id) {
    const patientId = (intakeRow.patient_id || intakeRow.created_patient_id) as string;
    const { data: patient } = await admin
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    if (patient) {
      const patientRow = patient as Patient;
      await linkPortalAccount(admin, userId, patientRow);
      return { patient: patientRow, clinic: await loadClinic(admin, patientRow.clinic_id) };
    }
  }

  if (intakeRow) {
    const patient = pendingPatientFromIntake(userId, userEmail, intakeRow);
    return { patient, clinic: await loadClinic(admin, patient.clinic_id) };
  }

  let registrationQuery = admin
    .from("patient_portal_registration_requests")
    .select("id, full_name, email, phone, address, clinic_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selectedClinicId) {
    registrationQuery = registrationQuery.eq("clinic_id", selectedClinicId);
  }

  const { data: registration } = await registrationQuery.maybeSingle();

  const registrationRow = registration as PortalRegistration | null;
  if (!registrationRow) return null;

  const patient = pendingPatientFromRegistration(userId, userEmail, registrationRow);
  return { patient, clinic: await loadClinic(admin, patient.clinic_id) };
}

async function loadClinic(admin: ReturnType<typeof supabaseAdmin>, clinicId: string | null) {
  if (!clinicId) return null;

  const { data: clinic } = await admin
    .from("clinics")
    .select("*")
    .eq("id", clinicId)
    .maybeSingle();

  return (clinic as Clinic | null) || null;
}

function pendingPatientFromIntake(userId: string, userEmail: string, intake: PortalIntake): Patient {
  return {
    id: userId,
    doctor_id: "",
    clinic_id: intake.clinic_id,
    emr_number: "Pending clinic review",
    full_name: intake.full_name || [intake.first_name, intake.last_name].filter(Boolean).join(" ") || "Patient",
    first_name: intake.first_name,
    last_name: intake.last_name,
    given_name: intake.first_name,
    family_name: intake.last_name,
    age: intake.age,
    birthdate: intake.birthdate,
    sex: intake.sex as Patient["sex"],
    phone: intake.phone,
    email: intake.email || userEmail,
    address: intake.address,
    address_line1: intake.address,
    address_line2: null,
    city: intake.city,
    state: intake.state,
    postal_code: intake.postal_code,
    country: intake.country,
    height_cm: intake.height_cm,
    blood_group: intake.blood_group,
    known_allergies: intake.known_allergies,
    chronic_conditions: intake.chronic_conditions,
    emergency_contact: intake.emergency_contact,
    abha_id: intake.abha_id,
    abha_address: intake.abha_address,
    created_at: new Date().toISOString(),
    last_visit_at: null,
  };
}

function pendingPatientFromRegistration(
  userId: string,
  userEmail: string,
  registration: PortalRegistration,
): Patient {
  return {
    id: userId,
    doctor_id: "",
    clinic_id: registration.clinic_id,
    emr_number: "Pending clinic review",
    full_name: registration.full_name || "Patient",
    first_name: null,
    last_name: null,
    given_name: null,
    family_name: null,
    age: null,
    birthdate: null,
    sex: null,
    phone: registration.phone,
    email: registration.email || userEmail,
    address: registration.address,
    address_line1: registration.address,
    address_line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: "India",
    height_cm: null,
    blood_group: null,
    known_allergies: null,
    chronic_conditions: null,
    emergency_contact: null,
    abha_id: null,
    abha_address: null,
    created_at: new Date().toISOString(),
    last_visit_at: null,
  };
}

async function findExistingPatientForPortalUser(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  userEmail: string | null,
  userFullName: string | null,
  selectedClinicId: string | null,
) {
  let registrationQuery = admin
    .from("patient_portal_registration_requests")
    .select("id, full_name, email, phone, address, clinic_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selectedClinicId) {
    registrationQuery = registrationQuery.eq("clinic_id", selectedClinicId);
  }

  const { data: registration } = await registrationQuery.maybeSingle();

  const registrationRow = registration as PortalRegistration | null;
  const emails = uniqueValues([userEmail, registrationRow?.email].map(normalizeEmail));
  const phones = phoneCandidates(registrationRow?.phone || null);
  const names = uniqueValues([userFullName, registrationRow?.full_name].map(normalizeName));

  for (const email of emails) {
    let patientQuery = admin
      .from("patients")
      .select("*")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectedClinicId) {
      patientQuery = patientQuery.eq("clinic_id", selectedClinicId);
    }

    const { data: patient } = await patientQuery.maybeSingle();

    if (patient) return patient as Patient;
  }

  for (const phone of phones) {
    let patientQuery = admin
      .from("patients")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectedClinicId) {
      patientQuery = patientQuery.eq("clinic_id", selectedClinicId);
    }

    const { data: patient } = await patientQuery.maybeSingle();

    if (patient) return patient as Patient;
  }

  for (const name of names) {
    let patientQuery = admin
      .from("patients")
      .select("*")
      .ilike("full_name", name)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectedClinicId) {
      patientQuery = patientQuery.eq("clinic_id", selectedClinicId);
    }

    const { data: patient } = await patientQuery.maybeSingle();

    if (patient) return patient as Patient;
  }

  return null;
}

async function linkPortalAccount(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  patient: Patient,
) {
  const payload = {
    user_id: userId,
    patient_id: patient.id,
    clinic_id: patient.clinic_id,
    status: "active",
  } as never;

  const { error } = await admin
    .from("patient_portal_accounts")
    .upsert(payload, { onConflict: "user_id" });

  if (!error) return;

  await admin
    .from("patient_portal_accounts")
    .update({
      user_id: userId,
      clinic_id: patient.clinic_id,
      status: "active",
    } as never)
    .eq("patient_id", patient.id);
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

function normalizeName(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  return trimmed || null;
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function phoneCandidates(value: string | null) {
  const digits = value?.replace(/\D/g, "") || "";
  if (!digits) return [];

  const withoutCountry = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
  return uniqueValues([
    value?.trim() || null,
    digits,
    withoutCountry,
    `+91${withoutCountry}`,
    `91${withoutCountry}`,
  ]);
}
