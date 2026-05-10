import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildOpConsultBundle } from "@/lib/fhir/bundle";
import { recordDisclosure } from "@/lib/fhir/disclosures";
import type { Doctor, Patient, PatientAllergy, Visit } from "@/types/db";

export const runtime = "nodejs";

// GET /api/fhir/visit/[id]
// Emits the visit as a FHIR R4 OPConsultRecord Bundle. Auth is enforced via
// RLS — doctors and clinic admins see only their clinic's visits.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ error: "Missing visit id" }, { status: 400 });
    }

    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: visit } = await sb
      .from("visits")
      .select("*")
      .eq("id", visitId)
      .maybeSingle();
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    const v = visit as Visit;

    const [{ data: patient }, { data: doctor }, { data: allergyRows }] =
      await Promise.all([
        sb.from("patients").select("*").eq("id", v.patient_id).maybeSingle(),
        sb.from("doctors").select("*").eq("id", v.doctor_id).maybeSingle(),
        sb.from("patient_allergies").select("*").eq("patient_id", v.patient_id),
      ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const bundle = buildOpConsultBundle({
      patient: patient as Patient,
      visit: v,
      doctor: doctor as Doctor,
      allergies: ((allergyRows as PatientAllergy[]) || []),
    });
    const body = JSON.stringify(bundle, null, 2);

    // Append-only audit log. Never fails the request.
    if (v.clinic_id) {
      try {
        await recordDisclosure({
          clinicId: v.clinic_id,
          patientId: v.patient_id,
          visitId: v.id,
          actorId: user.id,
          consumerType: "fhir_export",
          consumerLabel: "manual export",
          bundleProfile: "OPConsultRecord",
          body,
        });
      } catch (e) {
        console.error("[fhir] disclosure log failed", e);
      }
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/fhir+json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
