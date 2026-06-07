import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

type IntakeBody = Record<string, unknown>;

function text(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const selectedClinicId = cookieStore.get("patient_selected_clinic_id")?.value || null;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as IntakeBody;

  let accountQuery = supabase
    .from("patient_portal_accounts")
    .select("patient_id, clinic_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (selectedClinicId) {
    accountQuery = accountQuery.eq("clinic_id", selectedClinicId);
  }

  const { data: account } = await accountQuery.maybeSingle();

  let registrationQuery = supabase
    .from("patient_portal_registration_requests")
    .select("id, clinic_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selectedClinicId) {
    registrationQuery = registrationQuery.eq("clinic_id", selectedClinicId);
  }

  const { data: registration } = await registrationQuery.maybeSingle();

  const payload = {
    user_id: user.id,
    patient_id: account?.patient_id || null,
    registration_request_id: registration?.id || null,
    clinic_id: selectedClinicId || account?.clinic_id || registration?.clinic_id || null,
    first_name: text(body.first_name),
    last_name: text(body.last_name),
    full_name: text(body.full_name),
    birthdate: text(body.birthdate),
    age: numberOrNull(body.age),
    sex: text(body.sex),
    blood_group: text(body.blood_group),
    height_cm: numberOrNull(body.height_cm),
    phone: text(body.phone),
    email: text(body.email),
    emergency_contact: text(body.emergency_contact),
    address: text(body.address),
    city: text(body.city),
    state: text(body.state),
    postal_code: text(body.postal_code),
    country: text(body.country),
    known_allergies: text(body.known_allergies),
    chronic_conditions: text(body.chronic_conditions),
    chief_complaint: text(body.chief_complaint),
    abha_id: text(body.abha_id),
    abha_address: text(body.abha_address),
    bp_systolic: numberOrNull(body.bp_systolic),
    bp_diastolic: numberOrNull(body.bp_diastolic),
    pulse: numberOrNull(body.pulse),
    temperature_f: numberOrNull(body.temperature_f),
    spo2: numberOrNull(body.spo2),
    weight_kg: numberOrNull(body.weight_kg),
    status: "submitted",
  };

  if (!payload.full_name || !payload.phone) {
    return NextResponse.json(
      { ok: false, error: "Full name and phone are required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("patient_portal_intake_submissions")
    .insert(payload);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
