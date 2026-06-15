import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { Doctor } from "@/types/db";
 
export const runtime = "nodejs";
 
type ProfileBody = {
  memberId?: string;
  updates?: Partial<
    Pick<
      Doctor,
      | "full_name"
      | "qualification"
      | "registration_number"
      | "hpr_id"
      | "clinic_name"
      | "clinic_address"
      | "clinic_phone"
      | "signature_url"
      | "letterhead_url"
    >
  >;
};
 
const ALLOWED_UPDATE_KEYS = new Set([
  "full_name",
  "qualification",
  "registration_number",
  "hpr_id",
  "clinic_name",
  "clinic_address",
  "clinic_phone",
  "signature_url",
  "letterhead_url",
]);
 
export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
 
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
 
    const body = (await req.json()) as ProfileBody;
    const memberId = body.memberId?.trim();
    const incoming = body.updates || {};
 
    if (!memberId) {
      return NextResponse.json({ error: "Missing member" }, { status: 400 });
    }
 
    const fullName = incoming.full_name?.trim();
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
 
    const updates = Object.fromEntries(
      Object.entries(incoming).filter(([key]) => ALLOWED_UPDATE_KEYS.has(key)),
    ) as ProfileBody["updates"];
 
    const admin = supabaseAdmin();
    const { data: member, error: memberError } = await admin
      .from("doctors")
      .select("id, auth_user_id, role")
      .eq("id", memberId)
      .maybeSingle();
 
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
 
    const row = member as Pick<Doctor, "id" | "auth_user_id" | "role"> | null;
    if (!row) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
 
    if (row.id !== user.id && row.auth_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
 
    if (row.role === "medical_assistant") {
      delete updates?.letterhead_url;
    }
 
    const { data: saved, error: updateError } = await admin
      .from("doctors")
      .update(updates as never)
      .eq("id", memberId)
      .select("id")
      .single();
 
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
 
    return NextResponse.json({ ok: true, member: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save profile";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
 
 
 