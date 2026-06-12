import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { member, clinic } = await requireMember();
    if (!["medical_assistant", "doctor", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId")?.trim();
    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: patient } = await admin
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { data: visits, error } = await admin
      .from("visits")
      .select("*")
      .eq("patient_id", patientId)
      .eq("clinic_id", clinic.id)
      .order("visit_date", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ patient, visits: visits || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
