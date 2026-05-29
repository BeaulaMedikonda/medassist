import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import type { Patient, Visit } from "@/types/db";
import { ViewScreen } from "./ViewScreen";

export const dynamic = "force-dynamic";

export default async function VisitViewPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const supabase = await supabaseServer();
  const { id, vid } = await params;
  const { member, clinic } = await requireMember();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!patient) notFound();

  const { data: visit } = await supabase
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

  return (
    <ViewScreen patient={patient as Patient} visit={visit as Visit} />
  );
}
