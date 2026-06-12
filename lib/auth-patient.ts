import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasSupabaseAdminEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  decodePatientDemoSession,
  PATIENT_DEMO_PROFILE_COOKIE,
  PATIENT_DEMO_SESSION_COOKIE,
  patientDemoProfileKey,
} from "@/lib/patient-session";
import type { Clinic, Patient } from "@/types/db";
 
const PATIENT_SELECTED_CLINIC_COOKIE = "patient_selected_clinic_id";
const PATIENT_SELECTED_CLINIC_NAME_COOKIE = "patient_selected_clinic_name";
 
export type PatientSession = {
  userId: string;
  email: string;
  patient: Patient;
  clinic: Clinic | null;
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
  const cookieStore = await cookies();
  const demoMobile = cookieStore.get(PATIENT_DEMO_SESSION_COOKIE)?.value || "";
  if (demoMobile) {
    const demoSession = decodePatientDemoSession(demoMobile);
    if (!demoSession) {
      redirect("/patient/clinics");
    }
 
    const selectedClinicId = demoSession.clinicId;
    const selectedClinicName = demoSession.clinicName || null;
    const profileCookie = cookieStore.get(PATIENT_DEMO_PROFILE_COOKIE)?.value || "";
    const phone = demoSession.phone;
    const userId = `patient-demo-${phone || "mobile"}`;
    const selectedClinicUuid = validUuid(selectedClinicId) ? selectedClinicId : null;
 
    if (!selectedClinicUuid) {
      redirect("/patient/clinics");
    }
 
    if (hasSupabaseAdminEnv && phone) {
      const savedSession = await loadDemoPatientSessionByPhone(userId, phone, selectedClinicUuid);
      if (savedSession) return savedSession;
    }
 
    const matchingProfile = getDemoProfile(profileCookie, selectedClinicUuid, phone);
 
    return {
      userId,
      email: "",
      patient: demoPatient(phone, selectedClinicUuid, matchingProfile),
      clinic: selectedClinicName
        ? demoClinic(selectedClinicUuid, decodeURIComponent(selectedClinicName))
        : null,
    };
  }
 
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
 
  if (!user) redirect("/patient/login");
 
  const admin = supabaseAdmin();
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
 
function demoClinic(id: string, name: string): Clinic {
  return {
    id,
    name,
    address: null,
    phone: null,
    invite_code: "",
    city: null,
    state: null,
    email: null,
    established_year: null,
    letterhead_header: null,
    letterhead_footer: null,
    created_at: new Date().toISOString(),
  };
}
 
function getDemoProfile(value: string, clinicId: string | null, phone: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<Patient> | Record<string, Partial<Patient>>;
    const key = patientDemoProfileKey(clinicId, phone);
    const keyedProfile = parsed && !Array.isArray(parsed) && (parsed as Record<string, Partial<Patient>>)[key];
    if (keyedProfile) return keyedProfile;
  } catch {
    // Ignore malformed temporary profile cookies.
  }
  return null;
}
 
async function loadDemoPatientSessionByPhone(
  userId: string,
  phone: string,
  selectedClinicId: string | null,
): Promise<PatientSession | null> {
  const admin = supabaseAdmin();
  const clinicId = validUuid(selectedClinicId) ? selectedClinicId : null;
  if (!clinicId) return null;
 
  const { data: account } = await admin
    .from("patient_portal_accounts")
    .select("patient_id, clinic_id")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .eq("status", "active")
    .maybeSingle();
 
  const linkedPatientId = (account as { patient_id: string | null } | null)?.patient_id;
  if (linkedPatientId) {
    const { data: patientRow } = await admin
      .from("patients")
      .select("*")
      .eq("id", linkedPatientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
 
    if (patientRow) {
      const patient = patientRow as Patient;
      return {
        userId,
        email: patient.email || "",
        patient,
        clinic: await loadClinic(admin, patient.clinic_id),
      };
    }
  }
 
  let intakeQuery = admin
    .from("patient_portal_intake_submissions")
    .select("id, patient_id, created_patient_id, clinic_id, first_name, last_name, full_name, birthdate, age, sex, phone, email, address, city, state, postal_code, country, height_cm, blood_group, known_allergies, chronic_conditions, emergency_contact, abha_id, abha_address")
    .eq("phone", phone)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(1);
 
  const { data: intake } = await intakeQuery.maybeSingle();
  const intakeRow = intake as PortalIntake | null;
  if (intakeRow) {
    const patient = pendingPatientFromIntake(userId, "", intakeRow);
    return {
      userId,
      email: patient.email || "",
      patient,
      clinic: await loadClinic(admin, patient.clinic_id),
    };
  }
 
  return null;
}
 
function demoPatient(phone: string, clinicId: string | null, profile: Partial<Patient> | null): Patient {
  const firstName = profile?.first_name || null;
  const lastName = profile?.last_name || null;
  const fullName =
    profile?.full_name ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Patient";
 
  return {
    id: `patient-demo-${phone.replace(/\D/g, "") || "mobile"}`,
    doctor_id: "",
    clinic_id: clinicId,
    emr_number: "Mobile OTP login",
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    given_name: firstName,
    family_name: lastName,
    age: profile?.age ?? null,
    birthdate: profile?.birthdate || null,
    sex: profile?.sex || null,
    phone: profile?.phone || phone,
    email: profile?.email || null,
    address: profile?.address || null,
    address_line1: profile?.address_line1 || profile?.address || null,
    address_line2: profile?.address_line2 || null,
    city: profile?.city || null,
    state: profile?.state || null,
    postal_code: profile?.postal_code || null,
    country: profile?.country || "India",
    height_cm: profile?.height_cm ?? null,
    blood_group: profile?.blood_group || null,
    known_allergies: profile?.known_allergies || null,
    chronic_conditions: profile?.chronic_conditions || null,
    emergency_contact: profile?.emergency_contact || null,
    abha_id: profile?.abha_id || null,
    abha_address: profile?.abha_address || null,
    created_at: new Date().toISOString(),
    last_visit_at: null,
  };
}
 
function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") || "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}
 
function validUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
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
 
  return null;
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
 
async function findExistingPatientForPortalUser(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  userEmail: string | null,
  userFullName: string | null,
  selectedClinicId: string | null,
) {
  const emails = uniqueValues([userEmail].map(normalizeEmail));
  const names = uniqueValues([userFullName].map(normalizeName));
 
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
 
 
 