import { NextResponse } from "next/server";
import { logProviderAudit } from "@/lib/provider/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type LifecycleAction = "approve" | "reject" | "suspend" | "reactivate" | "expire" | "cancel" | "trial";

const ACTION_TO_STATUS: Record<LifecycleAction, { status: string; payment_status?: string; audit: string }> = {
  approve: { status: "trial", payment_status: "not_started", audit: "clinic_approved" },
  reject: { status: "cancelled", payment_status: "waived", audit: "clinic_rejected" },
  suspend: { status: "suspended", audit: "clinic_suspended" },
  reactivate: { status: "active", payment_status: "paid", audit: "clinic_reactivated" },
  expire: { status: "expired", audit: "clinic_expired" },
  cancel: { status: "cancelled", audit: "clinic_cancelled" },
  trial: { status: "trial", payment_status: "not_started", audit: "clinic_moved_to_trial" },
};

async function resolveEditor() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 as const };

  const admin = supabaseAdmin();
  const { data: caller } = await admin
    .from("platform_admins")
    .select("id,role,status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const ownerEmails = (process.env.PLATFORM_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isOwnerByEnv = ownerEmails.includes((user.email || "").toLowerCase());
  const role = (caller as { role?: string } | null)?.role;

  if (!caller && !isOwnerByEnv) return { error: "Forbidden", status: 403 as const };
  if (role && !["platform_owner", "platform_admin"].includes(role) && !isOwnerByEnv) {
    return { error: "Only owner/admin can change clinic lifecycle", status: 403 as const };
  }

  return { userId: user.id };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await resolveEditor();
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: clinicId } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: LifecycleAction; reason?: string };
  const action = body.action;

  if (!action || !(action in ACTION_TO_STATUS)) {
    return NextResponse.json({ error: "Invalid lifecycle action" }, { status: 400 });
  }

  const next = ACTION_TO_STATUS[action];
  const updates: Record<string, string> = { status: next.status };
  if (next.payment_status) updates.payment_status = next.payment_status;

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("clinic_subscriptions")
    .upsert({ clinic_id: clinicId, ...updates } as never, { onConflict: "clinic_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === "approve" || action === "reactivate" || action === "trial") {
    await admin
      .from("clinic_feature_flags")
      .upsert({ clinic_id: clinicId } as never, { onConflict: "clinic_id" });
  }

  await logProviderAudit({
    actorId: guard.userId,
    action: next.audit,
    entityType: "clinic",
    entityId: clinicId,
    metadata: { status: next.status, payment_status: next.payment_status || null, reason: body.reason || null },
  });

  return NextResponse.json({ ok: true, status: next.status });
}
