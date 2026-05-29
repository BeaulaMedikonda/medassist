import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { FaxClient } from "./FaxClient";

export const dynamic = "force-dynamic";

export default async function FaxPage() {
  const { member, clinic } = await requireMember();

  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }

  return <FaxClient clinicName={clinic.name} senderName={member.full_name} />;
}
