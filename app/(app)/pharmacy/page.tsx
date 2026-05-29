//app/(app)/pharmacy/page.tsx
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { PharmacyClient } from "./PharmacyClient";
 
export const dynamic = "force-dynamic";
 
export default async function PharmacyPage() {
  const { member } = await requireMember();
 
  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }
 
  return <PharmacyClient />;
}