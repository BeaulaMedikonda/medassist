import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import type { Patient, Visit } from "@/types/db";
import { ViewScreen, type FhirValidationSummary } from "./ViewScreen";

export const dynamic = "force-dynamic";

export default async function VisitViewPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { id, vid } = await params;
  const { member, clinic } = await requireMember();
  const db = member.role === "doctor" ? admin : supabase;

  const { data: patient } = await db
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!patient) notFound();

  const { data: visit } = await db
    .from("visits")
    .select("*")
    .eq("id", vid)
    .eq("patient_id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!visit) notFound();

  if (member.role === "doctor") {
    const doctorScope = await getDoctorAssignedScope(supabase, member.id, clinic.id);
    if (!doctorScope.visitIds.has(vid)) {
      notFound();
    }
  }

  // Visits that aren't completed yet have nothing meaningful to view in
  // read-only mode — bounce them back to the editable review screen.
  if ((visit as Visit).status !== "completed") {
    redirect(`/emr/${id}/visits/${vid}/review`);
  }

  const { data: validation } = await db
    .from("fhir_validation_results")
    .select("id,status,errors,warnings,validated_at,validator,bundle_profile")
    .eq("visit_id", vid)
    .eq("clinic_id", clinic.id)
    .order("validated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <ViewScreen
      patient={patient as Patient}
      visit={visit as Visit}
      initialValidation={(validation as FhirValidationSummary | null) || null}
    />
  );
}
