import { unstable_noStore as noStore } from "next/cache";
import { requireMember } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { IntakeFormClient } from "./Intakeformclient";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  noStore();

  const { member, clinic } = await requireMember();
  const supabase = await supabaseServer();

  const { data: doctors, error } = await supabase
    .from("doctors")
    .select("id, full_name, qualification, role")
    .eq("clinic_id", clinic.id)
    .eq("role", "doctor")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Doctors fetch error:", error.message);
  }

  return (
    <IntakeFormClient
      clinicId={clinic.id}
      currentUserId={member.id}
      inviteCode={clinic.invite_code}
      doctors={(doctors || []).map((doctor) => ({
        id: doctor.id,
        full_name: doctor.full_name,
        qualification: doctor.qualification,
      }))}
    />
  );
}