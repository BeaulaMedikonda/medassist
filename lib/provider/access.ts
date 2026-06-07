export type PlatformRole =
  | "platform_owner"
  | "platform_admin"
  | "platform_support"
  | "platform_billing";

export type PlatformAdmin = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  role: PlatformRole;
  status: "active" | "inactive";
};

export const ROLE_ACCESS: Record<string, PlatformRole[]> = {
  dashboard: ["platform_owner", "platform_admin", "platform_support", "platform_billing"],
  clinics: ["platform_owner", "platform_admin", "platform_support"],
  usage: ["platform_owner", "platform_admin"],
  billing: ["platform_owner", "platform_admin", "platform_billing"],
  features: ["platform_owner", "platform_admin"],
  audit: ["platform_owner", "platform_admin"],
  system: ["platform_owner", "platform_admin"],
  team: ["platform_owner"],
};

export const NAV_ALLOWED: Record<string, PlatformRole[]> = {
  "/app-provider": ROLE_ACCESS.dashboard,
  "/app-provider/clinics": ROLE_ACCESS.clinics,
  "/app-provider/usage": ROLE_ACCESS.usage,
  "/app-provider/billing": ROLE_ACCESS.billing,
  "/app-provider/features": ROLE_ACCESS.features,
  "/app-provider/audit": ROLE_ACCESS.audit,
  "/app-provider/system": ROLE_ACCESS.system,
  "/app-provider/team": ROLE_ACCESS.team,
};

export function canAccess(role: PlatformRole, section: keyof typeof ROLE_ACCESS) {
  return (ROLE_ACCESS[section] as PlatformRole[]).includes(role);
}
