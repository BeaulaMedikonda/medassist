"use client";

import { Suspense, useEffect, useRef, useState, type Ref } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

type Role = "ma" | "doctor" | "admin" | "provider";
type StaffRole = "medical_assistant" | "doctor" | "admin";

type ClinicChoice = {
  memberId: string;
  clinicId: string;
  clinicName: string;
  role: string;
};

const roleToStaffRole: Record<Exclude<Role, "provider">, StaffRole> = {
  ma: "medical_assistant",
  doctor: "doctor",
  admin: "admin",
};

const roleLabel: Record<string, string> = {
  medical_assistant: "Medical Assistant",
  doctor: "Doctor",
  admin: "Admin",
};

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const isProviderUrl = next === "/app-provider" || next.startsWith("/app-provider/");
  const { push } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>(isProviderUrl ? "provider" : "ma");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [clinicChoices, setClinicChoices] = useState<ClinicChoice[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

  const isProviderLogin = isProviderUrl || role === "provider";

  useEffect(() => {
    if (!isProviderLogin) return;
    setEmail("");
    setPassword("");
    setClinicChoices([]);
    setSelectedMemberId("");
  }, [isProviderLogin]);

  async function chooseWorkspace(memberId: string) {
    const res = await fetch("/api/auth/clinics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) throw new Error(j.error || "Could not select workspace");
  }

  async function loadWorkspaces(selectedRole: Exclude<Role, "provider">) {
    const roleParam = encodeURIComponent(roleToStaffRole[selectedRole]);
    const res = await fetch(`/api/auth/clinics?role=${roleParam}`, { cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      clinics?: ClinicChoice[];
    };
    if (!res.ok || !j.ok) throw new Error(j.error || "Could not load workspaces");
    return (j.clinics || []).filter((clinic) => clinic.role === roleToStaffRole[selectedRole]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const supabase = supabaseBrowser();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (isProviderLogin) {
          push({ title: "Welcome back", variant: "success" });
          router.replace("/app-provider");
          return;
        }

        const workspaces = await loadWorkspaces(role as Exclude<Role, "provider">);
        if (workspaces.length === 0) {
          if (role === "admin") {
            push({ title: "Set up your clinic", variant: "info" });
            router.replace("/onboarding");
            return;
          }
          push({
            title: "No matching role found",
            description: `This account is not linked as ${roleLabel[roleToStaffRole[role]]}.`,
            variant: "error",
          });
          await supabase.auth.signOut();
          return;
        }

        if (workspaces.length > 1) {
          setClinicChoices(workspaces);
          setSelectedMemberId(workspaces[0].memberId);
          push({ title: "Choose workspace", variant: "info" });
          return;
        }

        push({ title: "Welcome back", variant: "success" });
        router.replace(next);
      } else {
        if (role !== "admin") {
          push({
            title: "Admin signup only",
            description:
              "Medical assistants and doctors must be added by the clinic admin from the team settings.",
            variant: "error",
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role } },
        });

        if (error) throw error;

        if (data.session) {
          push({ title: "Account created", variant: "success" });
          router.replace("/onboarding");
        } else {
          push({
            title: "Check your inbox",
            description: "Confirm your email, then sign in to set up your clinic.",
            variant: "info",
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      push({
        title: mode === "signin" ? "Could not sign in" : "Could not create account",
        description: message,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function continueWithClinic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) {
      push({ title: "Choose a workspace", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      await chooseWorkspace(selectedMemberId);
      push({ title: "Welcome back", variant: "success" });
      router.replace(next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not select workspace";
      push({ title: "Workspace selection failed", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const roles: { key: Role; short: string; label: string; detail: string }[] = [
    { key: "ma", short: "MA", label: "Medical Assistant", detail: "Queue & intake" },
    { key: "doctor", short: "DR", label: "Doctor", detail: "Clinical review" },
    { key: "admin", short: "AD", label: "Admin", detail: "Clinic management" },
    { key: "provider", short: "AP", label: "App Provider", detail: "Platform management" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] px-4 py-12"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(14,165,164,0.08) 0%, transparent 70%)",
      }}
    >
      <div className="w-full max-w-[460px]">
        {/* Logo above card */}
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white px-8 py-8 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.12),0_1px_4px_rgba(15,23,42,0.06)]">
          <div className="mb-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0ea5a4]">
              {isProviderLogin ? "App provider access" : mode === "signin" ? "Welcome back" : "Get started"}
            </p>
            <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-slate-900">
              {isProviderLogin
                ? "Sign in to App Provider Console"
                : mode === "signin"
                ? "Sign in to MedAssist"
                : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              {isProviderLogin
                ? "Use your app-owner credentials to manage clinics."
                : mode === "signin"
                ? "Choose your role and continue to your workspace."
                : "Admin accounts only. Staff are invited by the clinic admin."}
            </p>
          </div>

          {/* Sign in / Create Account toggle */}
          {!isProviderLogin ? (
            <div className="mb-6 grid grid-cols-2 rounded-full border border-slate-200 bg-slate-100/70 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${
                  mode === "signin"
                    ? "bg-white text-[#0c8a89] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${
                  mode === "signup"
                    ? "bg-white text-[#0c8a89] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>
          ) : null}

          {/* Workspace picker */}
          {clinicChoices.length > 1 ? (
            <form onSubmit={continueWithClinic} className="space-y-5">
              <div>
                <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                  Select workspace
                </label>
                <div className="space-y-2">
                  {clinicChoices.map((clinic) => {
                    const active = selectedMemberId === clinic.memberId;
                    return (
                      <button
                        key={clinic.memberId}
                        type="button"
                        onClick={() => setSelectedMemberId(clinic.memberId)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-[#0ea5a4] bg-teal-50 text-teal-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-sm font-bold">{clinic.clinicName}</div>
                        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {roleLabel[clinic.role] || clinic.role}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
                {busy ? <Spinner /> : null}
                Continue
                <ArrowIcon />
              </button>
            </form>
          ) : (
            <form
              key={isProviderLogin ? "app-provider-login" : "clinic-login"}
              onSubmit={submit}
              className="space-y-5"
              autoComplete={isProviderLogin ? "off" : "on"}
            >
              {isProviderLogin ? (
                <>
                  <input className="hidden" name="username" type="text" autoComplete="username" />
                  <input className="hidden" name="password" type="password" autoComplete="current-password" />
                </>
              ) : null}

              {/* Role selector */}
              {!isProviderLogin ? (
                <div>
                  <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                    Your role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((item) => {
                      const active = role === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setRole(item.key);
                            emailInputRef.current?.focus();
                          }}
                          className={`relative rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-[#0ea5a4] bg-teal-50 shadow-sm"
                              : "border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                              active ? "bg-[#0ea5a4] text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.short}
                          </span>
                          <div className={`mt-2 text-[13px] font-bold ${active ? "text-teal-900" : "text-slate-800"}`}>
                            {item.label}
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-slate-400">{item.detail}</div>
                        </button>
                      );
                    })}
                  </div>

                  {mode === "signup" && role !== "admin" ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
                      Only the clinic Admin can create an account. Doctors and medical assistants are added by the admin via invite.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <AuthField
                label="Email Address"
                name={isProviderLogin ? "super_admin_email" : "email"}
                type="email"
                inputRef={emailInputRef}
                autoComplete={isProviderLogin ? "new-password" : "email"}
                value={email}
                onChange={setEmail}
                placeholder={isProviderLogin ? "provider@example.com" : "you@clinic.in"}
              />

              <div>
                <AuthField
                  label="Password"
                  name={isProviderLogin ? "super_admin_password" : "password"}
                  type="password"
                  minLength={6}
                  autoComplete={isProviderLogin ? "new-password" : mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                />
                {mode === "signin" ? (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          push({ title: "Enter your email first", variant: "error" });
                          return;
                        }
                        const supabase = supabaseBrowser();
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) {
                          push({ title: "Could not send reset email", description: error.message, variant: "error" });
                        } else {
                          push({ title: "Reset email sent", description: "Check your inbox for a password reset link.", variant: "info" });
                        }
                      }}
                      className="text-[12px] font-semibold text-[#0ea5a4] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary h-12 w-full"
              >
                {busy ? <Spinner /> : null}
                {isProviderLogin
                  ? "Sign In to App Provider Console"
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
                <ArrowIcon />
              </button>
            </form>
          )}

          {/* Security trust line */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <LockIcon />
            Secure clinic workspace &middot; Role-based access
          </div>

          {/* Patient portal separation */}
          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <p className="text-[12px] font-semibold text-slate-500">
              {isProviderLogin ? "Looking for staff login?" : "Are you a patient?"}
            </p>
            {isProviderLogin ? (
              <a href="/login" className="btn-secondary mt-2.5 h-10 w-full text-[13px]">
                Go to Staff Login
              </a>
            ) : (
              <a href="/patient/clinics" className="btn-secondary mt-2.5 h-10 w-full text-[13px]">
                Open Patient Portal
              </a>
            )}
          </div>
        </div>{/* end card */}

        <p className="mt-5 text-center text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} MedAssist. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark h-11 w-11">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v6a4 4 0 008 0V3" />
          <path d="M10 14v2a4 4 0 008 0v-2" />
          <circle cx="18" cy="11" r="2" />
        </svg>
      </div>
      <div>
        <div className="text-[19px] font-extrabold tracking-tight text-slate-900">MedAssist</div>
        <div className="text-[12px] font-medium text-slate-500">Clinic management & assisted EMR</div>
      </div>
    </div>
  );
}


function AuthField({
  label,
  name,
  value,
  onChange,
  type,
  placeholder,
  autoComplete,
  minLength,
  inputRef,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required
        ref={inputRef}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base h-12 rounded-2xl px-4"
      />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="8" rx="2" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
