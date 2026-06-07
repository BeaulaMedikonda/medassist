"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function PatientSignOutButton({ label = "Logout" }: { label?: string }) {
  const router = useRouter();

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    document.cookie = "patient_selected_clinic_id=; path=/; max-age=0; samesite=lax";
    document.cookie = "patient_selected_clinic_name=; path=/; max-age=0; samesite=lax";
    router.replace("/patient/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-[#0c8a89]"
    >
      {label}
    </button>
  );
}
