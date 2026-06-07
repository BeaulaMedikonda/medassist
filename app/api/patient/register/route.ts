import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { publicEnv, serverEnv } from "@/lib/env";

export const runtime = "nodejs";

type RegisterBody = {
  full_name?: string;
  phone?: string;
  email?: string;
  password?: string;
  address?: string;
  clinic_id?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isDuplicateEmailError(message: string | undefined) {
  const normalized = (message || "").toLowerCase();
  return normalized.includes("already") && normalized.includes("email");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RegisterBody;
    const fullName = clean(body.full_name);
    const phone = clean(body.phone);
    const email = clean(body.email).toLowerCase();
    const password = clean(body.password);
    const address = clean(body.address);
    const selectedClinicId = clean(body.clinic_id);

    if (!fullName || !phone || !email || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Name, phone, email, and 6 character password are required." },
        { status: 400 },
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey || !serverEnv.supabaseServiceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase environment variables are not loaded. Restart the server after setting .env.local." },
        { status: 500 },
      );
    }

    const admin = supabaseAdmin();

    if (selectedClinicId) {
      const { data: selectedClinic, error: selectedClinicError } = await admin
        .from("clinics")
        .select("id")
        .eq("id", selectedClinicId)
        .maybeSingle();

      if (selectedClinicError || !selectedClinic) {
        return NextResponse.json(
          { ok: false, error: "Selected clinic could not be found.", stage: "validate-clinic" },
          { status: 400 },
        );
      }
    }

    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "patient",
      },
    });

    const createdNewUser = Boolean(created.user);
    let portalUserId = created.user?.id || null;

    if ((userError || !portalUserId) && isDuplicateEmailError(userError?.message)) {
      const server = await supabaseServer();
      const {
        data: { user: existingUser },
      } = await server.auth.getUser();

      if (existingUser?.email?.toLowerCase() === email) {
        portalUserId = existingUser.id;
      }
    }

    if (userError && !portalUserId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            isDuplicateEmailError(userError.message)
              ? "This email is already registered. Use the same password, or sign in first and select this clinic."
              : userError.message || "Could not create patient login. Check Supabase Auth and service role key.",
          stage: "create-auth-user",
        },
        { status: 400 },
      );
    }

    if (!portalUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not create or reuse patient login.",
          stage: "resolve-auth-user",
        },
        { status: 400 },
      );
    }

    const patientFilters = [`email.eq.${email}`];
    if (phone) patientFilters.push(`phone.eq.${phone}`);

    let existingPatientQuery = admin
      .from("patients")
      .select("id, clinic_id")
      .or(patientFilters.join(","))
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectedClinicId) {
      existingPatientQuery = existingPatientQuery.eq("clinic_id", selectedClinicId);
    }

    const { data: existingPatient } = await existingPatientQuery.maybeSingle();

    if (existingPatient) {
      const patient = existingPatient as { id: string; clinic_id: string | null };
      const { error: linkError } = await admin.from("patient_portal_accounts").upsert({
        user_id: portalUserId,
        patient_id: patient.id,
        clinic_id: patient.clinic_id || selectedClinicId || null,
        status: "active",
      } as never);

      if (linkError) {
        if (createdNewUser && portalUserId) await admin.auth.admin.deleteUser(portalUserId);
        return NextResponse.json(
          { ok: false, error: linkError.message, stage: "link-existing-patient" },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true, linked: true });
    }

    const { error: requestError } = await admin
      .from("patient_portal_registration_requests")
      .insert({
        user_id: portalUserId,
        full_name: fullName,
        phone,
        email,
        address: address || null,
        clinic_id: selectedClinicId || null,
        status: "pending",
      } as never);

    if (requestError) {
      if (createdNewUser && portalUserId) await admin.auth.admin.deleteUser(portalUserId);
      return NextResponse.json(
        { ok: false, error: requestError.message, stage: "insert-registration-request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not register patient.",
      },
      { status: 500 },
    );
  }
}
