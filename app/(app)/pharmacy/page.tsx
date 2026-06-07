//app/(app)/pharmacy/page.tsx
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { FeatureDisabled } from "@/components/FeatureDisabled";
import { isClinicFeatureEnabled } from "@/lib/features";
import { PharmacyClient } from "./PharmacyClient";
 
export const dynamic = "force-dynamic";
 
export default async function PharmacyPage() {
  const { member, clinic } = await requireMember();
 
  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }

  if (!(await isClinicFeatureEnabled(clinic.id, "pharmacy"))) {
    return <FeatureDisabled featureName="Pharmacy" />;
  }
 
  return <PharmacyClient />;
}
