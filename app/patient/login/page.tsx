"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type HTMLAttributes } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import {
  encodePatientDemoSession,
  PATIENT_DEMO_SESSION_COOKIE,
} from "@/lib/patient-session";

const TEMP_PATIENT_OTP = "1234";

// ─── Feature list for left panel ────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    label: "Profile & Medical Info",
    detail: "Personal details, allergies, chronic conditions",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </svg>
    ),
    label: "Appointments",
    detail: "Scheduled visits and status updates",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2-5 4 10 2-5 2 3 2-3h4" />
      </svg>
    ),
    label: "Vitals & Visit Summaries",
    detail: "BP, pulse, SpO2 and clinical notes",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
    label: "Prescriptions & Reports",
    detail: "Medicines, lab results, uploaded files",
  },
];

// ─── Main inner component ────────────────────────────────────────────────────

function PatientLoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const requestedNext = search.get("next");
  const next =
    !requestedNext || requestedNext === "/patient/dashboard"
      ? "/patient/profile"
      : requestedNext;
  const error = search.get("error");
  const clinicId = search.get("clinic") || "";
  const clinicName = search.get("clinicName") || "";
  const [selectedClinicId, setSelectedClinicId] = useState(clinicId);
  const [selectedClinicName, setSelectedClinicName] = useState(clinicName);
  const { push } = useToast();

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (clinicId) {
      document.cookie = `${PATIENT_DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
      setSelectedClinicId(clinicId);
    }
    if (clinicName) {
      setSelectedClinicName(clinicName);
      return;
    }
    const cookieClinicId = document.cookie
      .split("; ")
      .find((c) => c.startsWith("patient_selected_clinic_id="))
      ?.split("=")[1];
    const cookieClinicName = document.cookie
      .split("; ")
      .find((c) => c.startsWith("patient_selected_clinic_name="))
      ?.split("=")[1];
    if (!clinicId && cookieClinicId) setSelectedClinicId(decodeURIComponent(cookieClinicId));
    if (cookieClinicName) setSelectedClinicName(decodeURIComponent(cookieClinicName));
  }, [clinicId, clinicName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const digits = mobile.replace(/\D/g, "");
      if (digits.length !== 10) throw new Error("Enter a 10-digit mobile number");
      if (otp !== TEMP_PATIENT_OTP) throw new Error("Invalid OTP. Use 1234 for now.");
      if (!selectedClinicId) throw new Error("Please select a clinic first.");

      document.cookie = `patient_selected_clinic_id=${encodeURIComponent(selectedClinicId)}; path=/; max-age=2592000; samesite=lax`;
      document.cookie = `patient_selected_clinic_name=${encodeURIComponent(selectedClinicName)}; path=/; max-age=2592000; samesite=lax`;
      document.cookie = `patient_demo_session=${encodePatientDemoSession({
        phone: digits,
        clinicId: selectedClinicId,
        clinicName: selectedClinicName,
      })}; path=/; max-age=2592000; samesite=lax`;

      push({ title: "Signed in", variant: "success" });
      router.replace(next);
    } catch (err: unknown) {
      push({
        title: "Could not sign in",
        description: err instanceof Error ? err.message : "Patient login failed",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#f7f9fc]">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_10%_8%,rgba(20,184,166,0.10),transparent_58%),radial-gradient(ellipse_45%_40%_at_90%_6%,rgba(37,99,235,0.08),transparent_58%)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Sticky top bar (mobile only) ──────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        <Brand />
        <Link
          href="/patient/clinics"
          className="text-[12px] font-bold text-slate-500 hover:text-[#0c8a89]"
        >
          Change clinic
        </Link>
      </header>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <main className="relative mx-auto grid min-h-screen max-w-6xl gap-0 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_460px] lg:items-center lg:py-0">

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <section className="hidden flex-col justify-center py-16 pr-12 lg:flex">
          <Brand large />

          <div className="mt-10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
              Patient Portal
            </p>
            <h1 className="mt-2 max-w-md text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900">
              Your health records, always within reach
            </h1>
            <p className="mt-4 max-w-sm text-[14px] font-medium leading-relaxed text-slate-500">
              Sign in with your registered mobile number to access your clinic records securely.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0ea5a4]">
                  {f.icon}
                </div>
                <div>
                  <p className="text-[13px] font-extrabold text-slate-800">{f.label}</p>
                  <p className="text-[12px] font-medium text-slate-500">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6">
            {["HIPAA Ready", "Mobile OTP Auth", "Clinic Assigned Access"].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* ── Right panel / form ──────────────────────────────────────────── */}
        <section className="w-full py-8 lg:py-16">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06),0_16px_48px_-16px_rgba(15,23,42,0.12)]">

            {/* Form header */}
            <div className="border-b border-slate-100 px-7 py-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
                Secure patient access
              </p>
              <h2 className="mt-1.5 text-[22px] font-extrabold tracking-tight text-slate-900">
                Sign in to Patient Portal
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Use your registered mobile number and OTP.
              </p>
            </div>

            <div className="px-7 py-6 space-y-5">
              {/* Clinic banner */}
              {selectedClinicName ? (
                <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0c8a89]">
                      Selected clinic
                    </p>
                    <p className="mt-0.5 text-[14px] font-extrabold text-slate-900">
                      {selectedClinicName}
                    </p>
                  </div>
                  <Link
                    href="/patient/clinics"
                    onClick={() => {
                      document.cookie = `${PATIENT_DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
                    }}
                    className="shrink-0 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#0c8a89] shadow-sm transition hover:bg-teal-50"
                  >
                    Change
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
                    No clinic selected
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-amber-800">
                    You need to select a clinic before signing in.
                  </p>
                  <Link
                    href="/patient/clinics"
                    className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-[12px] font-extrabold text-white transition hover:bg-amber-700"
                  >
                    Select clinic
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}

              {/* Not-linked error */}
              {error === "not-linked" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">Access denied</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-rose-700">
                    This mobile number is not registered for the selected clinic. Contact clinic staff.
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={submit} className="space-y-4">
                <LoginField
                  label="Mobile Number"
                  type="tel"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit registered number"
                  inputMode="numeric"
                  maxLength={10}
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  }
                />

                <LoginField
                  label="OTP"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit OTP"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  }
                />

                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0ea5a4] to-[#0c8a89] text-[14px] font-extrabold text-white shadow-[0_4px_14px_-4px_rgba(14,165,164,0.60)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <Spinner />
                  ) : (
                    <>
                      Continue
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* OTP hint */}
              <p className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-slate-400">
                <span className="font-extrabold text-slate-500">Testing:</span> OTP is 1234. Patient records are assigned by the clinic.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-7 py-4 text-center">
              <p className="text-[12px] font-medium text-slate-400">
                Need staff access?{" "}
                <Link href="/login" className="font-extrabold text-[#0c8a89] hover:underline">
                  Go to staff login
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-white shadow-[0_8px_20px_-8px_rgba(14,165,164,0.55)] ${
          large ? "h-11 w-11" : "h-8 w-8"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={large ? "h-5 w-5" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1116 0Z" />
          <path d="M9 10h6M12 7v6" />
        </svg>
      </div>
      <div>
        <div className={`font-extrabold tracking-tight text-slate-900 ${large ? "text-[18px]" : "text-[14px]"}`}>
          MedAssist
        </div>
        <div className={`font-medium text-slate-400 ${large ? "text-[12px]" : "text-[11px]"}`}>
          Patient health portal
        </div>
      </div>
    </div>
  );
}

function LoginField({
  label,
  value,
  onChange,
  type,
  placeholder,
  autoComplete,
  maxLength,
  inputMode,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  placeholder: string;
  autoComplete: string;
  maxLength?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-extrabold text-slate-700">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          required
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/15 ${
            icon ? "pl-10 pr-4" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function PatientLoginPage() {
  return (
    <Suspense fallback={null}>
      <PatientLoginInner />
    </Suspense>
  );
}
