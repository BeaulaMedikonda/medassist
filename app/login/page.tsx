"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

type Role = "ma" | "doctor" | "admin";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const { push } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("ma");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const supabase = supabaseBrowser();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        push({ title: "Welcome back", variant: "success" });
        router.replace(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          push({ title: "Account created", variant: "success" });
          router.replace("/onboarding");
          router.refresh();
        } else {
          push({
            title: "Check your inbox",
            description: "Confirm your email to finish signing up.",
            variant: "info",
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      push({
        title:
          mode === "signin"
            ? "Could not sign in"
            : "Could not create account",
        description: message,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const roles: { key: Role; short: string; label: string; detail: string }[] = [
    { key: "ma", short: "MA", label: "Medical Assistant", detail: "Queue and intake" },
    { key: "doctor", short: "DR", label: "Doctor", detail: "Clinical review" },
    { key: "admin", short: "AD", label: "Admin", detail: "Clinic control" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6faf9] p-4 sm:p-6">
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

      <main className="relative w-full max-w-[520px] overflow-hidden rounded-[30px] border border-white/70 bg-white/82 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <section className="flex min-h-[620px] items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-[440px]">
            <div className="mb-7">
              <BrandMark />
            </div>

            <div className="mb-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
                {mode === "signin" ? "Welcome back" : "Start your clinic setup"}
              </p>
              <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-slate-950">
                {mode === "signin" ? "Sign in to MedAssist" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {mode === "signin"
                  ? "Choose your role and continue to your workspace."
                  : "Create credentials first, then connect to your clinic."}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-full px-4 py-2 text-[13px] font-extrabold transition ${
                  mode === "signin"
                    ? "bg-white text-[#0c8a89] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-full px-4 py-2 text-[13px] font-extrabold transition ${
                  mode === "signup"
                    ? "bg-white text-[#0c8a89] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                  Select your role
                </label>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {roles.map((item) => {
                    const active = role === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRole(item.key)}
                        className={`relative rounded-2xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-[#0ea5a4] bg-[#ecfdfc] text-[#064e4b] shadow-[0_12px_26px_-20px_rgba(14,165,164,0.8)]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-[18px] font-extrabold leading-none">
                          {item.short}
                        </div>
                        <div className="mt-2 text-[12px] font-extrabold text-slate-900">
                          {item.label}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                          {item.detail}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <AuthField
                label="Email Address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder="you@clinic.in"
              />

              <AuthField
                label="Password"
                type="password"
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={setPassword}
                placeholder="At least 6 characters"
              />

              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f8f83] to-[#0ea5a4] px-4 py-2 text-[14px] font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(14,165,164,0.85)] transition hover:-translate-y-0.5 hover:from-[#0c7f76] hover:to-[#0d9895] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? <Spinner /> : null}
                {mode === "signin" ? "Sign In" : "Create Account"}
                <span aria-hidden="true">-&gt;</span>
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] font-medium text-slate-500">
              Protected workspace for clinic staff only.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function BrandMark({ large = false }: { large?: boolean }) {
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
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3v6a4 4 0 008 0V3" />
          <path d="M10 14v2a4 4 0 008 0v-2" />
          <circle cx="18" cy="11" r="2" />
        </svg>
      </div>
      <div>
        <div className={`${large ? "text-2xl" : "text-xl"} font-extrabold tracking-tight`}>
          MedAssist
        </div>
        <div className={`${large ? "text-sm text-cyan-100/70" : "text-sm text-slate-500"}`}>
          Clinic management & assisted EMR
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
