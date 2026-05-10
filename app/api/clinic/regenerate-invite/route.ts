import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { clinicId?: string };
  if (!body?.clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
  }

  // Function enforces admin-of-clinic; we rely on its checks.
  const { data, error } = await sb.rpc("regenerate_clinic_invite_code", {
    p_clinic: body.clinicId,
  });

  if (error) {
    const status = /admin/i.test(error.message) ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ invite_code: data as string });
}
