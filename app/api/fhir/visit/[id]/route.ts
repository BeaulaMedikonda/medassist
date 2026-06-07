import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildOpConsultBundle } from "@/lib/fhir/bundle";
import { recordDisclosure } from "@/lib/fhir/disclosures";
import { featureDisabledResponse, isClinicFeatureEnabled } from "@/lib/features";
import type {
  Appointment,
  Clinic,
  Doctor,
  Immunization,
  Patient,
  Referral,
  Visit,
} from "@/types/db";

type GraphicPainMap = {
  id: string;
  pain_type: string;
  intensity: number;
  pain_locations: string[] | null;
  marked_points: string[] | null;
  pain_summary: string | null;
  created_at: string;
};

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
    if (!v.clinic_id || !(await isClinicFeatureEnabled(v.clinic_id, "fhir_export"))) {
      return featureDisabledResponse("FHIR export");
    }

    const [
      { data: patient },
      { data: doctor },
      { data: clinic },
      { data: immunizationRows },
      { data: referralRows },
      { data: appointmentRows },
      { data: painMapRows },
    ] = await Promise.all([
      sb.from("patients").select("*").eq("id", v.patient_id).maybeSingle(),
      sb.from("doctors").select("*").eq("id", v.doctor_id).maybeSingle(),
      v.clinic_id
        ? sb.from("clinics").select("*").eq("id", v.clinic_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb
        .from("immunizations")
        .select("*")
        .eq("patient_id", v.patient_id)
        .or(`visit_id.eq.${v.id},date_given.eq.${v.visit_date.slice(0, 10)}`),
      sb.from("referrals").select("*").eq("visit_id", v.id),
      sb
        .from("appointments")
        .select("*")
        .eq("patient_id", v.patient_id)
        .gte("scheduled_at", v.visit_date)
        .order("scheduled_at", { ascending: true })
        .limit(3),
      sb
        .from("graphic_pain_maps")
        .select("id,pain_type,intensity,pain_locations,marked_points,pain_summary,created_at")
        .eq("visit_id", v.id),
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
      clinic: (clinic as Clinic | null) || null,
      immunizations: ((immunizationRows as Immunization[]) || []),
      referrals: ((referralRows as Referral[]) || []),
      appointments: ((appointmentRows as Appointment[]) || []),
      painMaps: ((painMapRows as GraphicPainMap[]) || []),
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
