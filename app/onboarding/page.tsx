import { redirect } from "next/navigation";
import { OnboardingForm } from "./OnboardingForm";
import { supabaseServer } from "@/lib/supabase/server";
import { getOptionalMember } from "@/lib/auth";
 
export const dynamic = "force-dynamic";
 
export default async function OnboardingPage() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
 
  if (!user) redirect("/login");
 
  const workspace = await getOptionalMember();
  if (workspace?.member && workspace.clinic) redirect("/dashboard");
 
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Set up your clinic
          </h1>
          <p className="mt-2 text-slate-600">
            Tell us a few things so we can route patients to the right person.
          </p>
        </div>
 
        <OnboardingForm userId={user.id} />
      </div>
    </main>
  );
}
 
 