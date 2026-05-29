import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { requireMember } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { Immunization, Patient } from "@/types/db";
import { ImmunizationsClient } from "./ImmunizationsClient";

export const dynamic = "force-dynamic";

export default async function ImmunizationsPage() {
  noStore();

  const { member, clinic } = await requireMember();

  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }

  const supabase = await supabaseServer();

  const [patientsResult, immunizationsResult] = await Promise.all([
    supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("full_name", { ascending: true })
      .limit(300),
    supabase
      .from("immunizations")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("date_given", { ascending: false })
      .limit(200),
  ]);

  return (
    <ImmunizationsClient
      clinicId={clinic.id}
      currentUserId={member.id}
      currentUserRole={member.role}
      patients={(patientsResult.data || []) as Patient[]}
      initialRecords={(immunizationsResult.data || []) as Immunization[]}
      initialError={patientsResult.error?.message || immunizationsResult.error?.message || null}
    />
  );
}
