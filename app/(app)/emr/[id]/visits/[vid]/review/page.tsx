import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import type { Immunization, Patient, Visit } from "@/types/db";
import { ReviewScreen } from "./ReviewScreen";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; vid: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const supabase = await supabaseServer();
  const { id, vid } = await params;
  const sp = await searchParams;
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

  const doctorScope =
    member.role === "doctor"
      ? await getDoctorAssignedScope(supabase, member.id, clinic.id)
      : null;
  if (doctorScope && !doctorScope.visitIds.has(vid)) {
    notFound();
  }

  // Once a visit is saved, default to the read-only viewer. Doctors who want
  // to amend pass ?edit=1 (the "Edit" button on the read-only screen does this).
  if ((visit as Visit).status === "completed" && sp?.edit !== "1") {
    redirect(`/emr/${id}/visits/${vid}/view`);
  }

  let prevVisitQuery = supabase
    .from("visits")
    .select("*")
    .eq("patient_id", id)
    .eq("clinic_id", clinic.id)
    .lt("visit_date", (visit as Visit).visit_date)
    .order("visit_date", { ascending: false })
    .limit(1);

  if (doctorScope) {
    prevVisitQuery = prevVisitQuery.in("id", Array.from(doctorScope.visitIds));
  }

  const { data: prevVisitRows } = await prevVisitQuery;
  const previousVisit = ((prevVisitRows || []) as Visit[])[0] || null;

  const { data: immunizationRows } = await supabase
    .from("immunizations")
    .select("*")
    .eq("patient_id", id)
    .eq("clinic_id", clinic.id)
    .order("date_given", { ascending: false })
    .limit(6);

  return (
    <ReviewScreen
      patient={patient as Patient}
      visit={visit as Visit}
      previousVisit={previousVisit}
      immunizations={(immunizationRows || []) as Immunization[]}
      clinicId={clinic.id}
      currentUserId={member.id}
      currentUserRole={member.role}
    />
  );
}
