import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { LanguageClient } from "./LanguageClient";

export const dynamic = "force-dynamic";

export default async function LanguagePage() {
  const { member, clinic } = await requireMember();

  if (member.role !== "doctor" && member.role !== "medical_assistant") {
    redirect("/dashboard");
  }

  return <LanguageClient clinicName={clinic.name} />;
}
