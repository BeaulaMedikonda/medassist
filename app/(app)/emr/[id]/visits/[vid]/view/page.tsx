import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
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

  // Visits that aren't completed yet have nothing meaningful to view in
  // read-only mode — bounce them back to the editable review screen.
  if ((visit as Visit).status !== "completed") {
    redirect(`/emr/${id}/visits/${vid}/review`);
  }

  return (
    <ViewScreen patient={patient as Patient} visit={visit as Visit} />
  );
}
