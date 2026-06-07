import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { FeatureDisabled } from "@/components/FeatureDisabled";
import { isClinicFeatureEnabled } from "@/lib/features";
import { FaxClient } from "./FaxClient";

export const dynamic = "force-dynamic";

export default async function FaxPage() {
  const { member, clinic } = await requireMember();

  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }

  if (!(await isClinicFeatureEnabled(clinic.id, "fax"))) {
    return <FeatureDisabled featureName="Fax" />;
  }

  return <FaxClient clinicName={clinic.name} senderName={member.full_name} />;
}
