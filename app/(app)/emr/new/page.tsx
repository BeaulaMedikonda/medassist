import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import type { Doctor } from "@/types/db";
import { IntakeFormClient } from "../intake/Intakeformclient";

export const dynamic = "force-dynamic";

export default async function NewEmrPage() {
  const { member, clinic } = await requireMember();

  if (member.role !== "medical_assistant") {
    redirect("/emr");
  }

  const supabase = await supabaseServer();

  // Roster of doctors in the clinic for the assignment dropdown.
  const { data: roster } = await supabase
    .from("doctors")
    .select("id, full_name, qualification, role")
    .eq("clinic_id", clinic.id)
    .eq("role", "doctor")
    .order("full_name");

  const doctors = ((roster as Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>) || [])
    .map((d) => ({
      id: d.id,
      full_name: d.full_name,
      qualification: d.qualification,
    }));

  return (
    <IntakeFormClient
      clinicId={clinic.id}
      doctors={doctors}
    />
  );
}
