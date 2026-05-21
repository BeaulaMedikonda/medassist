import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractEmrFromVisit } from "@/lib/claude/extract";
import { recordUsage, modelToService } from "@/lib/usage";
import type { Patient, Visit } from "@/types/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { visitId?: string };
    const visitId = body?.visitId;
    if (!visitId) {
      return NextResponse.json({ error: "Missing visitId" }, { status: 400 });
    }

    const { data: visit } = await sb
      .from("visits")
      .select("*")
      .eq("id", visitId)
      .single();
    if (!visit || (visit as Visit).doctor_id !== user.id) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const { data: patient } = await sb
      .from("patients")
      .select("*")
      .eq("id", (visit as Visit).patient_id)
      .single();
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { data: prevVisitRows } = await sb
      .from("visits")
      .select("*")
      .eq("patient_id", (patient as Patient).id)
      .lt("visit_date", (visit as Visit).visit_date)
      .order("visit_date", { ascending: false })
      .limit(1);
    const previousVisit = ((prevVisitRows || []) as Visit[])[0] || null;

    if (!(visit as Visit).transcript_text && !(visit as Visit).transcript_speakers) {
      return NextResponse.json(
        { error: "Visit has no transcript yet — run /api/transcribe first" },
        { status: 400 },
      );
    }

    const { result, modelUsed, raw, usage } = await extractEmrFromVisit({
      patient: patient as Patient,
      visit: visit as Visit,
      previousVisit,
    });

    // Fire-and-log: never block the response on cost-tracking insert.
    try {
      const service = modelToService(modelUsed);
      if (service && service !== "sarvam_stt") {
        await recordUsage({
          clinicId: (visit as Visit).clinic_id || (patient as Patient).clinic_id || "",
          userId: user.id,
          visitId,
          service,
          operation: "extract",
          claudeUsage: usage,
          metadata: { model: modelUsed },
        });
      }
    } catch (e) {
      console.error("[extract] usage log failed", e);
    }

    const followUpDate = computeFollowUpDate(
      (visit as Visit).visit_date,
      result.follow_up_days,
    );

    const admin = supabaseAdmin();
    const update: Record<string, unknown> = {
    ...(result.vitals.bp_systolic  != null && { bp_systolic:    result.vitals.bp_systolic }),
    ...(result.vitals.bp_diastolic != null && { bp_diastolic:   result.vitals.bp_diastolic }),
    ...(result.vitals.pulse        != null && { pulse:          result.vitals.pulse }),
    ...(result.vitals.temperature_f != null && { temperature_f: result.vitals.temperature_f }),
    ...(result.vitals.spo2         != null && { spo2:           result.vitals.spo2 }),
    ...(result.vitals.weight_kg    != null && { weight_kg:      result.vitals.weight_kg }),

      chief_complaints: result.chief_complaints,
      history_present_illness: result.history_present_illness,
      examination_findings: result.examination_findings,
      provisional_diagnosis: result.provisional_diagnosis,
      confirmed_diagnosis: result.confirmed_diagnosis,
      investigations_ordered: result.investigations_ordered,
      icd_codes: result.icd_codes,
      prescription: {
        medicines: result.prescription.medicines,
        previous_prescription_id: previousVisit?.id || null,
      },
      advice: result.advice,
      follow_up_date: followUpDate,
      follow_up_notes: result.follow_up_notes,
      doctor_speaker_id: result.doctor_speaker_id,
      doctor_id_confidence: result.doctor_id_confidence,
      field_assumptions: result.field_assumptions,
      speaker_roles: result.speaker_roles ?? {},
      // Don't downgrade a visit a doctor already completed by re-extracting.
      status: (visit as Visit).status === "completed" ? "completed" : "awaiting_review",
      llm_extraction_raw: {
        model: modelUsed,
        extraction: result,
        claude_response: raw,
      },
    };
    const { error } = await admin
      .from("visits")
      .update(update as never)
      .eq("id", visitId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      modelUsed,
      ambiguities: result.ambiguities,
      doctor_speaker_id: result.doctor_speaker_id,
      doctor_id_confidence: result.doctor_id_confidence,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function computeFollowUpDate(
  visitDate: string,
  days: number | null,
): string | null {
  if (!days || days <= 0) return null;
  const d = new Date(visitDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
