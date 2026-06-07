"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

function PatientLoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const requestedNext = search.get("next");
  const next = !requestedNext || requestedNext === "/patient/dashboard" ? "/patient/profile" : requestedNext;
  const error = search.get("error");
  const clinicId = search.get("clinic") || "";
  const clinicName = search.get("clinicName") || "";
  const [selectedClinicName, setSelectedClinicName] = useState(clinicName);
  const registerHref = clinicId
    ? `/patient/register?${new URLSearchParams({
        clinic: clinicId,
        clinicName,
      }).toString()}`
    : "/patient/register";
  const { push } = useToast();

  const [loginType, setLoginType] = useState<"mobile" | "patientId">("mobile");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (clinicName) {
      setSelectedClinicName(clinicName);
      return;
    }

    const cookieClinicName = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("patient_selected_clinic_name="))
      ?.split("=")[1];

    if (cookieClinicName) {
      setSelectedClinicName(decodeURIComponent(cookieClinicName));
    }
  }, [clinicName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const supabase = supabaseBrowser();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (clinicId) {
        document.cookie = `patient_selected_clinic_id=${encodeURIComponent(
          clinicId,
        )}; path=/; max-age=2592000; samesite=lax`;
        document.cookie = `patient_selected_clinic_name=${encodeURIComponent(
          selectedClinicName,
        )}; path=/; max-age=2592000; samesite=lax`;
      }

      router.replace(next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Patient login failed";
      push({
        title: "Could not sign in",
        description: message,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7fbfa]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_42%_at_18%_16%,rgba(59,130,246,0.14),transparent_62%),radial-gradient(ellipse_42%_44%_at_84%_10%,rgba(14,165,164,0.20),transparent_64%),linear-gradient(135deg,#f8fbff_0%,#effaf7_48%,#d8f3ea_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <main className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_520px] lg:py-10">
        <section className="hidden lg:block">
          <PatientBrand large />
          <div className="mt-10 max-w-xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
              Patient portal
            </p>
            <h1 className="mt-3 text-5xl font-extrabold leading-tight tracking-tight text-slate-950">
              Access your clinic health records in one place
            </h1>
            <p className="mt-5 max-w-lg text-base font-medium leading-7 text-slate-600">
              View patient details, assigned appointments, visit summaries, prescriptions, reports, and optional vitals shared by the clinic.
            </p>

            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3">
              {[
                ["Profile", "Personal and EMR details"],
                ["Visits", "Clinical summaries"],
                ["Vitals", "Latest measurements"],
                ["Reports", "Prescriptions and files"],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/75 bg-white/72 p-4 shadow-sm backdrop-blur">
                  <div className="text-sm font-extrabold text-slate-950">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full overflow-hidden rounded-[30px] border border-white/70 bg-white/82 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <div className="px-6 py-8 sm:px-10">
            <div className="mb-7 lg:hidden">
              <PatientBrand />
            </div>

            <div className="mb-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
                Secure patient access
              </p>
              <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-slate-950">
                Sign in to Patient Portal
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Use your registered clinic credentials to open your health records.
              </p>
            </div>

            {selectedClinicName ? (
              <div className="mb-5 rounded-2xl border border-teal-100 bg-teal-50/80 p-4">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#0c8a89]">
                  Selected clinic
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-950">
                  {selectedClinicName}
                </div>
                <Link href="/patient/clinics" className="mt-2 inline-flex text-xs font-extrabold text-[#0c8a89] hover:text-[#075f5d]">
                  Change clinic
                </Link>
              </div>
            ) : (
              <div className="mb-5 rounded-2xl border border-teal-100 bg-teal-50/80 p-4">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#0c8a89]">
                  Clinic required
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Select your clinic before signing in to the patient portal.
                </p>
                <Link
                  href="/patient/clinics"
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-extrabold text-[#0c8a89] shadow-sm transition hover:text-[#075f5d]"
                >
                  Select clinic
                </Link>
              </div>
            )}

            {error === "not-linked" ? (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                <p>
                  This login is not registered for the selected clinic yet.
                </p>
                <Link
                  href={registerHref}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-extrabold text-[#0c8a89] shadow-sm transition hover:text-[#075f5d]"
                >
                  Register for this clinic
                </Link>
              </div>
            ) : null}

            <div className="mb-6 grid grid-cols-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setLoginType("mobile")}
                className={`rounded-full px-4 py-2 text-[13px] font-extrabold transition ${
                  loginType === "mobile"
                    ? "bg-white text-[#0c8a89] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Mobile Login
              </button>
              <button
                type="button"
                onClick={() => setLoginType("patientId")}
                className={`rounded-full px-4 py-2 text-[13px] font-extrabold transition ${
                  loginType === "patientId"
                    ? "bg-white text-[#0c8a89] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Patient ID Login
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <AuthField
                label={loginType === "mobile" ? "Registered Email / Mobile Login" : "Patient ID / Registered Email"}
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder={loginType === "mobile" ? "patient@example.com" : "Use linked email for now"}
              />

              <AuthField
                label="Password"
                type="password"
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
              />

              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f8f83] to-[#0ea5a4] px-4 py-2 text-[14px] font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(14,165,164,0.85)] transition hover:-translate-y-0.5 hover:from-[#0c7f76] hover:to-[#0d9895] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? <Spinner /> : null}
                Continue
                <span aria-hidden="true">-&gt;</span>
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-[12px] font-semibold leading-5 text-slate-600">
              Patient records are assigned by the clinic. There is no doctor selection in this portal.
            </div>

            <div className="mt-5 flex flex-col gap-2 text-center text-[12px] font-medium text-slate-500">
              <p>New patient?</p>
              <Link href={registerHref} className="font-extrabold text-[#0c8a89] hover:text-[#075f5d]">
                Register for patient portal
              </Link>
              <p>Need staff access?</p>
              <Link href="/login" className="font-extrabold text-[#0c8a89] hover:text-[#075f5d]">
                Go to staff login
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function PatientBrand({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-white shadow-[0_18px_34px_-20px_rgba(14,165,164,0.9)] ${
          large ? "h-14 w-14" : "h-12 w-12"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={large ? "h-6 w-6" : "h-5 w-5"}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1116 0Z" />
          <path d="M9 10h6" />
          <path d="M12 7v6" />
        </svg>
      </div>
      <div>
        <div className={`${large ? "text-2xl" : "text-xl"} font-extrabold tracking-tight text-slate-950`}>
          MedAssist
        </div>
        <div className={`${large ? "text-base" : "text-sm"} text-slate-500`}>
          Patient health portal
        </div>
      </div>
    </div>
  );
}

function AuthField({
  label,
  value,
  onChange,
  type,
  placeholder,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </div>
  );
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={null}>
      <PatientLoginInner />
    </Suspense>
  );
}
