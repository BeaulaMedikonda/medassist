import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Doctor } from "@/types/db";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["doctor", "medical_assistant", "admin"] as const;

type CreateBody = {
  email?: string;
  password?: string;
  full_name?: string;
  role?: (typeof ALLOWED_ROLES)[number];
  qualification?: string;
  registration_number?: string;
};

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await sb
      .from("doctors")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    const meRow = me as Doctor | null;
    if (!meRow || meRow.role !== "admin") {
      return NextResponse.json(
        { error: "Only clinic admins can add team members" },
        { status: 403 },
      );
    }
    if (!meRow.clinic_id) {
      return NextResponse.json({ error: "Admin has no clinic" }, { status: 400 });
    }

    const body = (await req.json()) as CreateBody;
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const full_name = (body.full_name || "").trim();
    const role = body.role;
    const qualification = (body.qualification || "").trim();
    const registration_number = (body.registration_number || "").trim();

    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (!full_name) {
      return NextResponse.json({ error: "Full name required" }, { status: 400 });
    }
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Valid role required" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1) Create the auth user. We pre-confirm the email so they can sign in immediately.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: createErr?.message || "Could not create auth user" },
        { status: 500 },
      );
    }

    const newUserId = created.user.id;

    // 2) Insert their doctors row scoped to this clinic.
    const insert: Record<string, unknown> = {
      id: newUserId,
      full_name,
      role,
      clinic_id: meRow.clinic_id,
      qualification: role !== "medical_assistant" ? qualification || null : null,
      registration_number:
        role !== "medical_assistant" ? registration_number || null : null,
      preferred_language: "en",
    };
    const { error: rowErr } = await admin
      .from("doctors")
      .insert(insert as never);

    if (rowErr) {
      // Best-effort rollback so we don't leave an orphaned auth user.
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      member: {
        id: newUserId,
        email,
        full_name,
        role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
