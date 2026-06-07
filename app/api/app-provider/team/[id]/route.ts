import { NextResponse } from "next/server";
import { logProviderAudit } from "@/lib/provider/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_ROLES = new Set(["platform_owner", "platform_admin", "platform_support", "platform_billing"]);

async function guardOwner(): Promise<{ userId: string } | { error: string; status: number }> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const admin = supabaseAdmin();
  const { data: caller } = await admin
    .from("platform_admins")
    .select("role,status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const ownerEmails = (process.env.PLATFORM_OWNER_EMAILS || "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isOwnerByEnv = ownerEmails.includes((user.email || "").toLowerCase());

  const role = (caller as { role?: string } | null)?.role;
  if (!caller && !isOwnerByEnv) return { error: "Forbidden", status: 403 };
  if (role && role !== "platform_owner" && !isOwnerByEnv) {
    return { error: "Only the platform owner can manage team members", status: 403 };
  }

  return { userId: user.id };
}

type Body = { role?: string; status?: string };

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOwner();
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const admin = supabaseAdmin();

  // Fetch the target member to validate
  const { data: target } = await admin
    .from("platform_admins")
    .select("id,auth_user_id,role")
    .eq("id", id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Prevent self-deactivation
  if (body.status === "inactive" && (target as { auth_user_id: string }).auth_user_id === guard.userId) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  const updates: Record<string, string> = {};

  if (body.role !== undefined) {
    if (!VALID_ROLES.has(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    updates.role = body.role;
  }
  if (body.status !== undefined) {
    if (!["active", "inactive"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await admin
    .from("platform_admins")
    .update(updates as never)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logProviderAudit({
    actorId: guard.userId,
    action: updates.status ? "provider_staff_status_updated" : "provider_staff_role_updated",
    entityType: "platform_admin",
    entityId: id,
    metadata: updates,
  });

  return NextResponse.json({ ok: true });
}
