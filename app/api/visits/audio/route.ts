import { NextResponse } from "next/server";
import { getOptionalMember } from "@/lib/auth";
import { doctorCanAccessVisit } from "@/lib/doctor-access";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { Visit } from "@/types/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { visitId?: string; audioPath?: string };
    const visitId = body.visitId?.trim();
    const audioPath = body.audioPath?.trim();

    if (!visitId || !audioPath) {
      return NextResponse.json({ error: "Missing visitId or audioPath" }, { status: 400 });
    }

    if (!audioPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Audio path does not belong to this user" }, { status: 403 });
    }

    const memberContext = await getOptionalMember();
    const member = memberContext?.member;
    const clinicId = memberContext?.clinic?.id;
    if (!member || !clinicId) {
      return NextResponse.json({ error: "Clinic member not found" }, { status: 403 });
    }

    const admin = supabaseAdmin();
    const { data: visit, error: visitError } = await admin
      .from("visits")
      .select("id, clinic_id")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError) {
      return NextResponse.json({ error: visitError.message }, { status: 500 });
    }

    const v = visit as Pick<Visit, "id" | "clinic_id"> | null;
    if (!v || v.clinic_id !== clinicId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (member.role === "doctor" && !(await doctorCanAccessVisit(sb, member.id, clinicId, visitId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: updateError } = await admin
      .from("visits")
      .update({ audio_url: audioPath, status: "in_progress" } as never)
      .eq("id", visitId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
