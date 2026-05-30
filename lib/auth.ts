import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import type { Doctor, Clinic } from "@/types/db";

const ACTIVE_CLINIC_COOKIE = "active_clinic_id";
const ACTIVE_MEMBER_COOKIE = "active_member_id";

// Convenience: fetch the signed-in user, their staff row, and their clinic in one go.
// Redirects to /login or /onboarding when missing.
export async function requireMember(): Promise<{
  userId: string;
  email: string;
  member: Doctor;
  clinic: Clinic;
}> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const activeClinicId = cookieStore.get(ACTIVE_CLINIC_COOKIE)?.value || null;
  const activeMemberId = cookieStore.get(ACTIVE_MEMBER_COOKIE)?.value || null;

  let memberQuery = sb
    .from("doctors")
    .select("*")
    .eq("auth_user_id", user.id)
    .not("clinic_id", "is", null);

  if (activeMemberId) {
    memberQuery = memberQuery.eq("id", activeMemberId);
  }

  if (activeClinicId) {
    memberQuery = memberQuery.eq("clinic_id", activeClinicId);
  }

  const { data: members } = await memberQuery;
  let memberRows = (members as Doctor[] | null) || [];
  if (memberRows.length === 0) {
    const { data: legacyMember } = await sb
      .from("doctors")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    memberRows = legacyMember ? [legacyMember as Doctor] : [];
  }
  const member = memberRows[0] || null;

  if (!member || !(member as Doctor).clinic_id) redirect("/onboarding");

  const { data: clinic } = await sb
    .from("clinics")
    .select("*")
    .eq("id", (member as Doctor).clinic_id as string)
    .maybeSingle();
  if (!clinic) redirect("/onboarding");

  return {
    userId: user.id,
    email: user.email || "",
    member: member as Doctor,
    clinic: clinic as Clinic,
  };
}

export async function getOptionalMember(): Promise<{
  userId: string;
  email: string;
  member: Doctor | null;
  clinic: Clinic | null;
} | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const activeClinicId = cookieStore.get(ACTIVE_CLINIC_COOKIE)?.value || null;
  const activeMemberId = cookieStore.get(ACTIVE_MEMBER_COOKIE)?.value || null;

  let memberQuery = sb
    .from("doctors")
    .select("*")
    .eq("auth_user_id", user.id)
    .not("clinic_id", "is", null);

  if (activeMemberId) {
    memberQuery = memberQuery.eq("id", activeMemberId);
  }

  if (activeClinicId) {
    memberQuery = memberQuery.eq("clinic_id", activeClinicId);
  }

  const { data: members } = await memberQuery;
  let memberRows = (members as Doctor[] | null) || [];
  if (memberRows.length === 0) {
    const { data: legacyMember } = await sb
      .from("doctors")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    memberRows = legacyMember ? [legacyMember as Doctor] : [];
  }
  const m = memberRows[0] || null;

  let clinic: Clinic | null = null;
  if (m?.clinic_id) {
    const { data: c } = await sb
      .from("clinics")
      .select("*")
      .eq("id", m.clinic_id)
      .maybeSingle();
    clinic = c as Clinic | null;
  }

  return {
    userId: user.id,
    email: user.email || "",
    member: m,
    clinic,
  };
}
