import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existingMember } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // If profile already exists with a clinic, jump straight to the right home.
  const m = existingMember as { id: string; clinic_id: string | null } | null;
  if (m?.clinic_id) redirect("/emr");

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Set up your clinic
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tell us a few things so we can route patients to the right person.
          </p>
        </div>
        <OnboardingForm userId={user.id} />
      </div>
    </div>
  );
}
