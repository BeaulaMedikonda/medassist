"use client";

import { useRouter } from "next/navigation";

export function PatientSignOutButton({
  label = "Sign out",
  variant = "light",
}: {
  label?: string;
  variant?: "light" | "dark";
}) {
  const router = useRouter();

  async function signOut() {
    document.cookie = "patient_demo_session=; path=/; max-age=0; samesite=lax";
    document.cookie = "patient_selected_clinic_id=; path=/; max-age=0; samesite=lax";
    document.cookie = "patient_selected_clinic_name=; path=/; max-age=0; samesite=lax";
    router.replace("/patient/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className={
        variant === "dark"
          ? "inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/8 text-[13px] font-extrabold text-white/70 transition hover:bg-white/15 hover:text-white"
          : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-[#0c8a89]"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {label}
    </button>
  );
}
