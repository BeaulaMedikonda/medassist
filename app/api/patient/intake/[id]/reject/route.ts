import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { member, clinic } = await requireMember();
  if (member.role !== "medical_assistant" && member.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: submission } = await admin
    .from("patient_portal_intake_submissions")
    .select("id, clinic_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found" }, { status: 404 });
  }

  if ((submission as { clinic_id: string | null }).clinic_id && (submission as { clinic_id: string }).clinic_id !== clinic.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if ((submission as { status: string }).status !== "submitted") {
    return NextResponse.json({ ok: false, error: "Only pending submissions can be rejected" }, { status: 400 });
  }

  const { error } = await admin
    .from("patient_portal_intake_submissions")
    .update({
      status: "rejected",
      reviewed_by: member.id,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
