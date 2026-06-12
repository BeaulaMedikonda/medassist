import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Patient, Visit } from "@/types/db";

export const runtime = "nodejs";

type PainMarkerInput = {
  id?: string;
  side?: string;
  location?: string;
  x?: number;
  y?: number;
  intensity?: number;
  painType?: string;
};

type CreatePainMapBody = {
  patientId?: string;
  visitId?: string;
  painType?: string;
  intensity?: number;
  painLocations?: string[];
  markedPoints?: string[];
  painSummary?: string;
  markers?: PainMarkerInput[];
};

export async function POST(req: Request) {
  try {
    const { member, clinic } = await requireMember();
    if (!["medical_assistant", "doctor", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as CreatePainMapBody;
    const patientId = body.patientId?.trim();
    const visitId = body.visitId?.trim();
    const painType = body.painType?.trim() || "Sharp";
    const intensity = Number(body.intensity);
    const markers = Array.isArray(body.markers) ? body.markers : [];

    if (!patientId || !visitId) {
      return NextResponse.json({ error: "Patient and visit are required" }, { status: 400 });
    }
    if (!Number.isInteger(intensity) || intensity < 0 || intensity > 10) {
      return NextResponse.json({ error: "Intensity must be between 0 and 10" }, { status: 400 });
    }
    if (markers.length === 0) {
      return NextResponse.json({ error: "Mark at least one pain location before saving" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: patient } = await admin
      .from("patients")
      .select("id, clinic_id")
      .eq("id", patientId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!(patient as Pick<Patient, "id" | "clinic_id"> | null)) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { data: visit } = await admin
      .from("visits")
      .select("id, patient_id, clinic_id")
      .eq("id", visitId)
      .eq("patient_id", patientId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!(visit as Pick<Visit, "id" | "patient_id" | "clinic_id"> | null)) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const { data: savedPainMap, error } = await admin
      .from("graphic_pain_maps")
      .insert({
        clinic_id: clinic.id,
        patient_id: patientId,
        visit_id: visitId,
        created_by: member.id,
        pain_type: painType,
        intensity,
        pain_locations: body.painLocations || markers.map((marker) => marker.location || "Pain point"),
        marked_points: body.markedPoints || markers.map(formatMarkedPoint),
        pain_summary: body.painSummary || markers.map(formatMarkedPoint).join("; "),
        markers,
      } as never)
      .select("id, pain_type, intensity, pain_summary, marked_points, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin
      .from("visits")
      .update({
        pre_visit_summary: null,
        pre_visit_summary_generated_at: null,
      } as never)
      .eq("id", visitId)
      .eq("clinic_id", clinic.id);

    return NextResponse.json({ ok: true, painMap: savedPainMap });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function formatMarkedPoint(marker: PainMarkerInput) {
  const location = marker.location || "Pain point";
  const painType = marker.painType || "Pain";
  const intensity = typeof marker.intensity === "number" ? marker.intensity : "";
  return `${location} - ${painType} - ${intensity}/10`;
}
