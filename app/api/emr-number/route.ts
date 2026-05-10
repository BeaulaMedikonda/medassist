import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateEmrNumber } from "@/lib/emr";

export const runtime = "nodejs";

export async function POST() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const emr_number = await generateEmrNumber();
    return NextResponse.json({ emr_number });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
