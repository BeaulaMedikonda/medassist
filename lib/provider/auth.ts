import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  canAccess,
  ROLE_ACCESS,
  type PlatformAdmin,
} from "@/lib/provider/access";

export {
  canAccess,
  NAV_ALLOWED,
  ROLE_ACCESS,
  type PlatformAdmin,
  type PlatformRole,
} from "@/lib/provider/access";

function envOwnerEmails() {
  return (process.env.PLATFORM_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requirePlatformAdmin(): Promise<{
  userId: string;
  email: string;
  admin: PlatformAdmin;
}> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect("/login?next=/app-provider");

  const email = (user.email || "").toLowerCase();
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("platform_admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (data) {
    return {
      userId: user.id,
      email,
      admin: data as PlatformAdmin,
    };
  }

  if (envOwnerEmails().includes(email)) {
    return {
      userId: user.id,
      email,
      admin: {
        id: user.id,
        auth_user_id: user.id,
        email,
        full_name: user.user_metadata?.full_name || null,
        role: "platform_owner",
        status: "active",
      },
    };
  }

  redirect("/dashboard");
}

export async function requireProviderRole(section: keyof typeof ROLE_ACCESS) {
  const result = await requirePlatformAdmin();
  if (!canAccess(result.admin.role, section)) {
    redirect("/app-provider");
  }
  return result;
}
