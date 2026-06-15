import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Immunization, Visit } from "@/types/db";

export const runtime = "nodejs";

type CreatePatientImmunizationBody = {
  vaccineName?: string;
  cvxCode?: string | null;
  dateGiven?: string;
  dose?: string | null;
  nextDueDate?: string | null;
  status?: Immunization["status"];
  notes?: string | null;
};

const STATUSES = new Set(["completed", "scheduled", "declined", "contraindicated"]);

export async function GET() {
  try {
    const { patient } = await requirePatient();
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("immunizations")
      .select("id, vaccine_name, date_given, dose, cvx_code, status, next_due_date, notes, created_at")
      .eq("patient_id", patient.id)
      .order("date_given", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ immunizations: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { patient, clinic } = await requirePatient();
    const body = (await req.json().catch(() => ({}))) as CreatePatientImmunizationBody;
    const patientId = patient.id;
    const clinicId = clinic?.id || patient.clinic_id || "";
    const vaccineName = body.vaccineName?.trim();
    const dateGiven = body.dateGiven?.trim();
    const status = body.status || "completed";

    if (!validUuid(patientId) || !validUuid(clinicId)) {
      return NextResponse.json(
        { error: "Immunizations can be saved after clinic staff links your portal profile." },
        { status: 400 },
      );
    }
    if (!vaccineName || !dateGiven) {
      return NextResponse.json(
        { error: "Enter the vaccine name and date given." },
        { status: 400 },
      );
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid immunization status." }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: activeVisit } = await admin
      .from("visits")
      .select("id")
      .eq("patient_id", patientId)
      .eq("clinic_id", clinicId)
      .in("status", ["queued", "intake", "in_progress", "awaiting_review"])
      .order("visit_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const visitId = (activeVisit as Pick<Visit, "id"> | null)?.id || null;
    const { data, error } = await admin
      .from("immunizations")
      .insert({
        patient_id: patientId,
        visit_id: visitId,
        clinic_id: clinicId,
        vaccine_name: vaccineName,
        cvx_code: nullableText(body.cvxCode),
        date_given: dateGiven,
        dose: nullableText(body.dose),
        next_due_date: body.nextDueDate || null,
        status,
        notes: nullableText(body.notes),
        created_by: null,
        updated_by: null,
        created_role: null,
      } as never)
      .select("id, vaccine_name, date_given, dose, cvx_code, status, next_due_date, notes, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, immunization: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed : null;
}

function validUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}
