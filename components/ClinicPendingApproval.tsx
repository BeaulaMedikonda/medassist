"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function ClinicPendingApproval({ clinicName }: { clinicName: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
      <section className="w-full rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="h-7 w-7 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Awaiting App Provider Approval
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          <span className="font-black text-slate-900">{clinicName}</span> has been
          registered and is waiting for the App Provider to approve your account.
          You will be able to access your clinic once the approval is granted.
        </p>

        <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-left text-sm text-amber-900">
          <p className="font-bold">What happens next?</p>
          <ul className="mt-2 space-y-1 font-medium">
            <li>• The App Provider reviews your clinic registration</li>
            <li>• You will receive access once approved (usually within 24 hours)</li>
            <li>• Come back and sign in — your dashboard will be ready</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f8f83] to-[#0ea5a4] px-6 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            Check approval status
          </button>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
