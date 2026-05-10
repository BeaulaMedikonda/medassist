import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Patient, Visit } from "@/types/db";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  const { data: visit } = await supabase
    .from("visits")
    .select("*")
    .eq("id", vid)
    .maybeSingle();
  if (!visit) notFound();

  // Once a visit is saved, default to the read-only viewer. Doctors who want
  // to amend pass ?edit=1 (the "Edit" button on the read-only screen does this).
  if ((visit as Visit).status === "completed" && sp?.edit !== "1") {
    redirect(`/emr/${id}/visits/${vid}/view`);
  }

  const { data: prevVisitRows } = await supabase
    .from("visits")
    .select("*")
    .eq("patient_id", id)
    .lt("visit_date", (visit as Visit).visit_date)
    .order("visit_date", { ascending: false })
    .limit(1);
  const previousVisit = ((prevVisitRows || []) as Visit[])[0] || null;

  return (
    <ReviewScreen
      patient={patient as Patient}
      visit={visit as Visit}
      previousVisit={previousVisit}
    />
  );
}
