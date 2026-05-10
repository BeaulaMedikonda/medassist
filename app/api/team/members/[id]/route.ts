import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Doctor } from "@/types/db";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["doctor", "medical_assistant", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

async function getMe(sb: Awaited<ReturnType<typeof supabaseServer>>): Promise<Doctor | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("doctors")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Doctor | null) || null;
}

async function getTarget(
  admin: ReturnType<typeof supabaseAdmin>,
  id: string,
): Promise<Doctor | null> {
  const { data } = await admin
    .from("doctors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Doctor | null) || null;
}

async function countAdminsInClinic(
  admin: ReturnType<typeof supabaseAdmin>,
  clinicId: string,
): Promise<number> {
  const { count } = await admin
    .from("doctors")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("role", "admin");
  return count || 0;
}

// PATCH /api/team/members/[id]  body: { role: "doctor" | "medical_assistant" | "admin" }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sb = await supabaseServer();
    const { id } = await params;
    const me = await getMe(sb);
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (me.role !== "admin") {
      return NextResponse.json(
        { error: "Only clinic admins can change roles" },
        { status: 403 },
      );
    }
    if (!me.clinic_id) {
      return NextResponse.json({ error: "Admin has no clinic" }, { status: 400 });
    }

    const body = (await req.json()) as { role?: string };
    const role = body.role as AllowedRole | undefined;
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Valid role required" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const target = await getTarget(admin, id);
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.clinic_id !== me.clinic_id) {
      return NextResponse.json(
        { error: "Member is not in your clinic" },
        { status: 403 },
      );
    }
    if (target.role === role) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    // Don't let the last admin demote themselves out of the role.
    if (target.role === "admin" && role !== "admin") {
      const adminCount = await countAdminsInClinic(admin, me.clinic_id);
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              "This is the only admin in the clinic. Promote another member to admin first.",
          },
          { status: 400 },
        );
      }
    }

    const update: Record<string, unknown> = { role };
    const { error } = await admin
      .from("doctors")
      .update(update as never)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      member: { id, role },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/team/members/[id]
//
// Soft delete:
//  - Removes the Supabase auth user (kills login)
//  - Detaches the doctors row from the clinic (clinic_id = null)
//
// Why soft, not hard? `patients.doctor_id` and `visits.doctor_id` use ON DELETE
// CASCADE, so dropping the doctors row would also delete every patient and
// visit they ever owned. The soft-delete keeps history intact while making
// sure they can no longer sign in or appear on the team list.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sb = await supabaseServer();
    const { id } = await params;
    const me = await getMe(sb);
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (me.role !== "admin") {
      return NextResponse.json(
        { error: "Only clinic admins can remove members" },
        { status: 403 },
      );
    }
    if (!me.clinic_id) {
      return NextResponse.json({ error: "Admin has no clinic" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const target = await getTarget(admin, id);
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.clinic_id !== me.clinic_id) {
      return NextResponse.json(
        { error: "Member is not in your clinic" },
        { status: 403 },
      );
    }

    const removingSelf = id === me.id;

    // Last-admin guard. Applies to both self-delete and removing someone else.
    if (target.role === "admin") {
      const adminCount = await countAdminsInClinic(admin, me.clinic_id);
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: removingSelf
              ? "Promote another member to admin before removing your own account."
              : "This is the only admin in the clinic. Promote another member to admin first.",
          },
          { status: 400 },
        );
      }
    }

    // 1) Delete the Supabase auth user. If they were already removed via the
    //    Supabase dashboard we still want to continue — log and proceed.
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) {
      console.warn(
        "[team/delete] auth.admin.deleteUser failed:",
        authErr.message,
      );
    }

    // 2) Detach the doctors row from the clinic so they vanish from the team list.
    const update: Record<string, unknown> = { clinic_id: null };
    const { error: rowErr } = await admin
      .from("doctors")
      .update(update as never)
      .eq("id", id);
    if (rowErr) {
      return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      removed: { id, self: removingSelf },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
