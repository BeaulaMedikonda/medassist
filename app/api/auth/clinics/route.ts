import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACTIVE_CLINIC_COOKIE = "active_clinic_id";
const ACTIVE_MEMBER_COOKIE = "active_member_id";

type ClinicMembership = {
  memberId: string;
  clinicId: string;
  clinicName: string;
  role: string;
};

async function getUserId() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user?.id || null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("doctors")
      .select("id, role, clinic_id, clinic_name, clinics(id, name)")
      .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
      .not("clinic_id", "is", null)
      .order("clinic_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const clinics = ((data || []) as Array<{
      id: string;
      role: string;
      clinic_id: string | null;
      clinic_name: string | null;
      clinics: { id: string; name: string } | { id: string; name: string }[] | null;
    }>)
      .map((row): ClinicMembership | null => {
        const clinic = Array.isArray(row.clinics) ? row.clinics[0] : row.clinics;
        const clinicId = row.clinic_id || clinic?.id;
        const clinicName = clinic?.name || row.clinic_name;
        if (!clinicId || !clinicName) return null;
        return {
          memberId: row.id,
          clinicId,
          clinicName,
          role: row.role,
        };
      })
      .filter((clinic): clinic is ClinicMembership => clinic !== null);

    return NextResponse.json({ ok: true, clinics });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { clinicId?: string; memberId?: string };
    const clinicId = body.clinicId?.trim();
    const memberId = body.memberId?.trim();
    if (!memberId && !clinicId) {
      return NextResponse.json({ error: "Missing clinic or role" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    let membershipQuery = admin
      .from("doctors")
      .select("id, clinic_id")
      .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
      .not("clinic_id", "is", null);

    if (memberId) {
      membershipQuery = membershipQuery.eq("id", memberId);
    } else if (clinicId) {
      membershipQuery = membershipQuery.eq("clinic_id", clinicId);
    }

    const { data: memberships, error } = await membershipQuery.limit(2);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const membershipRows = ((memberships || []) as unknown) as Array<{
      id: string;
      clinic_id: string | null;
    }>;

    if (membershipRows.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 },
      );
    }

    if (membershipRows.length > 1) {
      return NextResponse.json(
        { error: "Choose a specific role for this clinic" },
        { status: 400 },
      );
    }

    const membership = membershipRows[0];
    if (!membership.clinic_id) {
      return NextResponse.json({ error: "Membership has no clinic" }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_CLINIC_COOKIE, membership.clinic_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    cookieStore.set(ACTIVE_MEMBER_COOKIE, membership.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
