import { NextResponse } from "next/server";
import { logProviderAudit } from "@/lib/provider/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  email?: string;
  fullName?: string;
  role?: string;
};

const VALID_ROLES = new Set(["platform_owner", "platform_admin", "platform_support", "platform_billing"]);

async function getCallerAndGuard() {
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

  return { userId: user.id, error: null };
}

export async function POST(req: Request) {
  const guard = await getCallerAndGuard();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim() || null;
  const role = body.role?.trim();

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!role || !VALID_ROLES.has(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const admin = supabaseAdmin();

  // Check if already a platform admin
  const { data: existing } = await admin
    .from("platform_admins")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "This email is already a provider team member" }, { status: 409 });
  }

  // Find existing Supabase auth user by email
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  let authUserId: string | null = null;
  const authUser = users.find((u) => u.email?.toLowerCase() === email);

  if (authUser) {
    authUserId = authUser.id;
  } else {
    // Invite the user — creates an auth account and sends invite email
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });
    authUserId = invited.user.id;
  }

  const { data: newMember, error: insertError } = await admin
    .from("platform_admins")
    .insert({
      auth_user_id: authUserId,
      email,
      full_name: fullName,
      role,
      status: "active",
    } as never)
    .select("id,email,full_name,role,status,created_at")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await logProviderAudit({
    actorId: String(guard.userId),
    action: "provider_staff_added",
    entityType: "platform_admin",
    entityId: (newMember as { id?: string } | null)?.id || email,
    metadata: { email, fullName, role },
  });

  return NextResponse.json({ ok: true, member: newMember });
}
