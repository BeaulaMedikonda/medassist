import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Doctor } from "@/types/db";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
  "name",
  "address",
  "phone",
  "email",
  "city",
  "state",
  "established_year",
  "letterhead_header",
  "letterhead_footer",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PATCH(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await sb
    .from("doctors")
    .select("role, clinic_id")
    .eq("id", user.id)
    .maybeSingle();
  const m = member as Pick<Doctor, "role" | "clinic_id"> | null;
  if (!m?.clinic_id) {
    return NextResponse.json({ error: "Not a clinic member" }, { status: 403 });
  }
  if (m.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can update clinic settings" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = (body as Record<string, unknown>)[key as AllowedField];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await sb
    .from("clinics")
    .update(update as never)
    .eq("id", m.clinic_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
