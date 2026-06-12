import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { requireMember } from "@/lib/auth";
import { FeatureDisabled } from "@/components/FeatureDisabled";
import { isClinicFeatureEnabled } from "@/lib/features";
import { supabaseServer } from "@/lib/supabase/server";
import type { Immunization, Patient } from "@/types/db";
import { ImmunizationsClient } from "./ImmunizationsClient";
 
export const dynamic = "force-dynamic";
 
export default async function ImmunizationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ patientId?: string; visitId?: string; returnTo?: string }>;
}) {
  noStore();
  const params = await searchParams;
 
  const { member, clinic } = await requireMember();
 
  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }
 
  if (!(await isClinicFeatureEnabled(clinic.id, "immunizations"))) {
    return <FeatureDisabled featureName="Immunizations" />;
  }
 
  const supabase = await supabaseServer();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  // Fetch queue patient IDs and immunizations in parallel
  const [todayVisitsResult, olderActiveVisitsResult, pendingPortalResult, immunizationsResult] = await Promise.all([
    // Today's visits (any status)
    supabase
      .from("visits")
      .select("patient_id")
      .eq("clinic_id", clinic.id)
      .gte("visit_date", dayStart.toISOString()),
    // Carried-over visits from previous days still in an active status
    supabase
      .from("visits")
      .select("patient_id")
      .eq("clinic_id", clinic.id)
      .in("status", ["intake", "queued", "in_progress", "awaiting_review"])
      .lt("visit_date", dayStart.toISOString()),
    // Portal patients registered but not yet assigned to a visit
    supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("emr_number", "Pending clinic review"),
    supabase
      .from("immunizations")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("date_given", { ascending: false })
      .limit(200),
  ]);

  // Dedupe patient IDs from all sources; always include the pre-selected patient if provided
  const queuePatientIds = [
    ...new Set([
      ...(todayVisitsResult.data || []).map((v) => v.patient_id as string),
      ...(olderActiveVisitsResult.data || []).map((v) => v.patient_id as string),
      ...(pendingPortalResult.data || []).map((p) => (p as { id: string }).id),
      ...(params?.patientId ? [params.patientId] : []),
    ]),
  ].filter(Boolean);

  const patientsResult =
    queuePatientIds.length > 0
      ? await supabase
          .from("patients")
          .select("*")
          .in("id", queuePatientIds)
          .order("full_name", { ascending: true })
      : { data: [] as Patient[], error: null };

  return (
    <ImmunizationsClient
      patients={(patientsResult.data || []) as Patient[]}
      initialRecords={(immunizationsResult.data || []) as Immunization[]}
      initialError={patientsResult.error?.message || immunizationsResult.error?.message || null}
      initialPatientId={params?.patientId || ""}
      initialVisitId={params?.visitId || ""}
      returnTo={params?.returnTo || ""}
    />
  );
}
 
 