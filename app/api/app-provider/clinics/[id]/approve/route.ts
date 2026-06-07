import { NextResponse } from "next/server";
import { logProviderAudit } from "@/lib/provider/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function resolvePlatformAdmin(userId: string, email: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("platform_admins")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (data) return true;

  const ownerEmails = (process.env.PLATFORM_OWNER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return ownerEmails.includes(email.toLowerCase());
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPlatformAdmin = await resolvePlatformAdmin(user.id, user.email || "");
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: clinicId } = await params;
  const admin = supabaseAdmin();

  const { error: subError } = await admin
    .from("clinic_subscriptions")
    .update({ status: "trial", payment_status: "not_started" } as never)
    .eq("clinic_id", clinicId)
    .eq("status", "pending_approval");

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // Seed default feature flags on approval so the clinic can use all enabled features immediately.
  await admin
    .from("clinic_feature_flags")
    .insert({ clinic_id: clinicId } as never)
    .select()
    .maybeSingle()
    .then(() => void 0);

  await logProviderAudit({
    actorId: user.id,
    action: "clinic_approved",
    entityType: "clinic",
    entityId: clinicId,
    metadata: { source: "legacy_approve_route" },
  });

  return NextResponse.json({ ok: true });
}
