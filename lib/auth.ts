import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Doctor, Clinic } from "@/types/db";

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

  const { data: member } = await sb
    .from("doctors")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
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

  const { data: member } = await sb
    .from("doctors")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const m = member as Doctor | null;

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
