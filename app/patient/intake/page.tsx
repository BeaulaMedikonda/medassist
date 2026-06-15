import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/patient/PatientCards";
import { OnlinePatientIntakeForm } from "./OnlinePatientIntakeForm";

export const dynamic = "force-dynamic";

export default async function PatientIntakePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/patient/intake");

  return (
    <main className="min-h-screen bg-[#f7fbfa] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Online patient intake"
          title="Personal Details"
          description="Submit your personal, medical, ABHA, and optional vitals information. The medical assistant will review this and assign a doctor."
        />
        <OnlinePatientIntakeForm initialEmail={user.email || ""} />
      </section>
    </main>
  );
}
