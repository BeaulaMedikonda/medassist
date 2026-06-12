import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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
