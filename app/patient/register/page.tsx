"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toast";

type FormState = {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  clinic_id: string;
};

function PatientRegisterInner() {
  const router = useRouter();
  const search = useSearchParams();
  const clinicId = search.get("clinic") || "";
  const clinicName = search.get("clinicName") || "";
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    clinic_id: clinicId,
  });

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      const res = await fetch("/api/patient/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "manual",
        body: JSON.stringify(form),
      });
      const responseText = await res.text();
      let json: { ok?: boolean; error?: string; stage?: string } = {};
      try {
        json = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `Registration API did not return JSON. Status ${res.status}. Response: ${responseText.slice(0, 140)}`,
        );
      }

      if (!res.ok || !json.ok) {
        throw new Error(
          json.error ||
            `Could not register patient. API status ${res.status}${json.stage ? ` at ${json.stage}` : ""}.`,
        );
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;
      await supabase.auth.signOut();

      push({
        title: "Registration created",
        description: "Please sign in with your registered email and password to open your patient portal.",
        variant: "success",
      });
      const loginHref = clinicId
        ? `/patient/login?${new URLSearchParams({
            clinic: clinicId,
            clinicName,
          }).toString()}`
        : "/patient/login";
      router.replace(loginHref);
      router.refresh();
    } catch (err: unknown) {
      push({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Could not register patient.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7fbfa] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_48%_42%_at_18%_16%,rgba(20,184,166,0.16),transparent_62%),radial-gradient(ellipse_42%_44%_at_84%_10%,rgba(37,99,235,0.13),transparent_64%),linear-gradient(135deg,#f8fbff_0%,#eefaf7_50%,#e0f2fe_100%)]" />
      <section className="relative w-full max-w-[560px] rounded-[28px] border border-white/75 bg-white/88 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
          New patient
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
          Register for Patient Portal
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Create your patient portal login and submit basic details for clinic review.
        </p>

        {clinicName ? (
          <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/80 p-4">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#0c8a89]">
              Selected clinic
            </div>
            <div className="mt-1 text-sm font-extrabold text-slate-950">
              {clinicName}
            </div>
            <Link href="/patient/clinics" className="mt-2 inline-flex text-xs font-extrabold text-[#0c8a89]">
              Change clinic
            </Link>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} />
          <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
          <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
          <Field label="Password" type="password" value={form.password} onChange={(value) => update("password", value)} />
          <Field label="Address" value={form.address} onChange={(value) => update("address", value)} />

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0f8f83] to-[#2563eb] px-4 text-sm font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? "Creating..." : "Create Patient Login"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm font-semibold text-slate-500">
          Already registered?{" "}
          <Link
            href={
              clinicId
                ? `/patient/login?${new URLSearchParams({
                    clinic: clinicId,
                    clinicName,
                  }).toString()}`
                : "/patient/login"
            }
            className="font-extrabold text-[#0c8a89]"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PatientRegisterPage() {
  return (
    <Suspense fallback={null}>
      <PatientRegisterInner />
    </Suspense>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        required={label !== "Address"}
        minLength={type === "password" ? 6 : undefined}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </label>
  );
}
