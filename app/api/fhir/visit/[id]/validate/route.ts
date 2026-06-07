import { NextResponse } from "next/server";
import { getOptionalMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import { buildOpConsultBundle } from "@/lib/fhir/bundle";
import { validateWithOfficialFhirValidator } from "@/lib/fhir/official-validator";
import { validateFhirBundle } from "@/lib/fhir/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ error: "Missing visit id" }, { status: 400 });
    }

    const memberContext = await getOptionalMember();
    if (!memberContext?.member || !memberContext.clinic) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { member, clinic } = memberContext;
    if (member.role !== "doctor" && member.role !== "admin") {
      return NextResponse.json({ error: "Only doctors and admins can validate FHIR bundles" }, { status: 403 });
    }
    if (!(await isClinicFeatureEnabled(clinic.id, "fhir_export"))) {
      return featureDisabledResponse("FHIR export");
    }

    const sb = await supabaseServer();
    const { data: visit } = await sb
      .from("visits")
      .select("*")
      .eq("id", visitId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const v = visit as Visit;
    if (v.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed visits can be validated" },
        { status: 400 },
      );
    }

    if (member.role === "doctor") {
      const doctorScope = await getDoctorAssignedScope(sb, member.id, clinic.id);
      if (!doctorScope.visitIds.has(v.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const [
      { data: patient },
      { data: doctor },
      { data: clinicRow },
      { data: immunizationRows },
      { data: referralRows },
      { data: appointmentRows },
      { data: painMapRows },
    ] = await Promise.all([
      sb.from("patients").select("*").eq("id", v.patient_id).eq("clinic_id", clinic.id).maybeSingle(),
      sb.from("doctors").select("*").eq("id", v.doctor_id).maybeSingle(),
      sb.from("clinics").select("*").eq("id", clinic.id).maybeSingle(),
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
      clinic: (clinicRow as Clinic | null) || clinic,
      immunizations: ((immunizationRows as Immunization[]) || []),
      referrals: ((referralRows as Referral[]) || []),
      appointments: ((appointmentRows as Appointment[]) || []),
      painMaps: ((painMapRows as GraphicPainMap[]) || []),
    });

    const appResult = validateFhirBundle(bundle);
    const officialResult = await validateWithOfficialFhirValidator(bundle);
    const errors = [...appResult.errors, ...officialResult.errors];
    const warnings = [...appResult.warnings, ...officialResult.warnings];
    const result = {
      status: errors.length > 0 ? "failed" as const : warnings.length > 0 ? "warning" as const : "passed" as const,
      errors,
      warnings,
    };
    const admin = supabaseAdmin() as any;
    const { data: saved, error: saveError } = await admin
      .from("fhir_validation_results")
      .insert({
        clinic_id: clinic.id,
        patient_id: v.patient_id,
        visit_id: v.id,
        actor_id: member.id,
        bundle_profile: "OPConsultRecord",
        validator: officialResult.enabled ? "app-basic+hl7-validator-cli" : "app-basic",
        status: result.status,
        errors: result.errors,
        warnings: result.warnings,
        validated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({
      validation: saved,
      result,
      officialValidator: {
        enabled: officialResult.enabled,
        validator: officialResult.validator,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not validate FHIR bundle";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
