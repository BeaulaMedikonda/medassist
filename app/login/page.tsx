"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearMalformedSupabaseAuthStorage, supabaseBrowser } from "@/lib/supabase/browser";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return EMAIL_RE.test(cleanEmail(value));
}

function safeAuthMessage(err: unknown, fallback = "Please check your credentials and try again.") {
  const message = err instanceof Error ? err.message : "";
  return /header|token|jwt|apikey|authorization|supabase|service_role|access_token/i.test(message)
    ? fallback
    : message || fallback;
}

// ─── Features shown on the left panel ────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M5 10a5 5 0 0010 0M10 15v3M7 18h6" />
      </svg>
    ),
    label: "Voice-to-text EMR charting",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 2.5C7.5 6 6 8.5 6 10s1.5 4 4 7.5M10 2.5C12.5 6 14 8.5 14 10s-1.5 4-4 7.5M2.5 10h15" />
      </svg>
    ),
    label: "Patient portal & ABDM / ABHA",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12v3H4zM4 10h8M4 14h5" />
        <circle cx="15" cy="14" r="3" />
        <path d="M17.5 16.5l2 2" />
      </svg>
    ),
    label: "AI-powered pre-visit summaries",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M7 2v4M13 2v4M3 9h14" />
        <path d="M7 13h2M11 13h2" />
      </svg>
    ),
    label: "Appointments & referral management",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8L10 2z" />
      </svg>
    ),
    label: "30+ languages, multi-clinic support",
  },
];

// ─── Inner component ───────────────────────────────────────────────────────────

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const explicitNext = search.get("next");
  const next = explicitNext || "/dashboard";
  const isProviderUrl = next === "/app-provider" || next.startsWith("/app-provider/");
  const { push } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>(isProviderUrl ? "provider" : "ma");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clinicChoices, setClinicChoices] = useState<ClinicChoice[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

  const isProviderLogin = isProviderUrl || role === "provider";
  const emailError =
    emailTouched && email.trim() && !isValidEmail(email)
      ? "Enter a valid email address."
      : "";

  useEffect(() => {
    if (!isProviderLogin) return;
    setEmail("");
    setPassword("");
    setClinicChoices([]);
    setSelectedMemberId("");
  }, [isProviderLogin]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const resetUrl = new URL("/reset-password", window.location.origin);
      resetUrl.searchParams.set("code", code);
      window.location.replace(resetUrl.toString());
      return;
    }

    if (window.location.hash.includes("type=recovery")) {
      window.location.replace(`/reset-password${window.location.hash}`);
      return;
    }

    clearMalformedSupabaseAuthStorage();
    const supabase = supabaseBrowser();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session && explicitNext) {
        router.replace(next);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password");
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [explicitNext, next, router]);

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
    setEmailTouched(true);

    if (!isValidEmail(email)) {
      push({ title: "Enter a valid email address", variant: "error" });
      emailInputRef.current?.focus();
      return;
    }

    setBusy(true);
    clearMalformedSupabaseAuthStorage();
    const supabase = supabaseBrowser();
    const targetEmail = cleanEmail(email);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password });
        if (error) throw error;

        if (isProviderLogin) {
          push({ title: "Welcome back", variant: "success" });
          router.replace("/app-provider");
          return;
        }

        const workspaces = await loadWorkspaces(role as Exclude<Role, "provider">);
        if (workspaces.length === 0) {
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
            description: "Medical assistants and doctors must be added by the clinic admin from team settings.",
            variant: "error",
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: targetEmail,
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
      const message = safeAuthMessage(err);
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

  async function handleForgotPassword() {
    setEmailTouched(true);
    const targetEmail = cleanEmail(email);
    if (!targetEmail) {
      push({ title: "Enter your email first", variant: "error" });
      emailInputRef.current?.focus();
      return;
    }
    if (!isValidEmail(targetEmail)) {
      push({ title: "Enter a valid email address", variant: "error" });
      emailInputRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const eligibilityRole = isProviderLogin
        ? "provider"
        : roleToStaffRole[role as Exclude<Role, "provider">];
      const eligibilityRes = await fetch("/api/auth/password-reset-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, role: eligibilityRole }),
      });
      const eligibility = (await eligibilityRes.json().catch(() => ({}))) as {
        ok?: boolean;
        eligible?: boolean;
        error?: string;
      };

      if (!eligibilityRes.ok || !eligibility.ok) {
        push({ title: "Could not check email", description: eligibility.error || "Try again.", variant: "error" });
        return;
      }

      if (!eligibility.eligible) {
        const roleName = isProviderLogin
          ? "App Provider"
          : roleLabel[eligibilityRole] || "selected role";
        push({
          title: "No matching account found",
          description: `This email is not registered as ${roleName}.`,
          variant: "error",
        });
        emailInputRef.current?.focus();
        return;
      }

      clearMalformedSupabaseAuthStorage();
      const supabase = supabaseBrowser();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: callbackUrl.toString(),
      });
      if (error) {
        push({ title: "Could not send reset email", description: error.message, variant: "error" });
      } else {
        push({
          title: "Check your inbox",
          description: "If an account exists for this email, a password reset link has been sent.",
          variant: "info",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not send reset email.";
      push({ title: "Could not send reset email", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const roles: { key: Role; short: string; label: string; detail: string; color: string }[] = [
    { key: "ma", short: "MA", label: "Medical Assistant", detail: "Queue & intake", color: "#06b6d4" },
    { key: "doctor", short: "DR", label: "Doctor", detail: "Clinical review", color: "#0ea5a4" },
    { key: "admin", short: "AD", label: "Admin", detail: "Clinic management", color: "#6366f1" },
    { key: "provider", short: "AP", label: "App Provider", detail: "Platform management", color: "#f59e0b" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div
        className="hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[46%] xl:w-[42%]"
        style={{
          background: "linear-gradient(160deg, #062b3d 0%, #0a3d52 40%, #0c5c6e 75%, #0f7a78 100%)",
        }}
      >
        {/* Top: logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
            <StethoscopeIcon />
          </div>
          <div>
            <div className="text-[17px] font-extrabold tracking-tight text-white">MedAssist</div>
            <div className="text-[11px] font-medium text-white/50">Clinic management & EMR</div>
          </div>
        </div>

        {/* Middle: headline + features */}
        <div className="space-y-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-300/80">
              HIPAA-ready · Made for India
            </p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.18] tracking-tight text-white">
              Modern EMR for<br />
              <span className="text-teal-300">the way you work</span>
            </h2>
            <p className="mt-4 max-w-[340px] text-[14px] font-medium leading-relaxed text-white/60">
              From voice charting to patient portal, MedAssist handles the entire clinic workflow in one place.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-300">
                  {f.icon}
                </span>
                <span className="text-[13px] font-semibold text-white/80">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: trust badges */}
        <div className="flex flex-wrap gap-2">
          {["HIPAA Ready", "ABDM Compatible", "Role-Based Access", "End-to-End Encrypted"].map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/50"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f8fafb] px-5 py-12 sm:px-8">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="brand-mark h-10 w-10">
            <StethoscopeIcon />
          </div>
          <div>
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">MedAssist</div>
            <div className="text-[11px] font-medium text-slate-500">Clinic management & EMR</div>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Heading */}
          <div className="mb-7">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0ea5a4]">
              {isProviderLogin ? "App provider access" : mode === "signin" ? "Welcome back" : "Get started"}
            </p>
            <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-slate-900">
              {isProviderLogin
                ? "App Provider Console"
                : mode === "signin"
                ? "Sign in to MedAssist"
                : "Create your account"}
            </h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              {isProviderLogin
                ? "Use your app-owner credentials to manage clinics."
                : mode === "signin"
                ? "Choose your role and continue to your workspace."
                : "Admin accounts only. Staff are invited by the clinic admin."}
            </p>
          </div>

          {/* Sign in / Create account toggle */}
          {!isProviderLogin ? (
            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
                  mode === "signin"
                    ? "bg-gradient-to-r from-[#0ea5a4] to-[#0c8a89] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
                  mode === "signup"
                    ? "bg-gradient-to-r from-[#0ea5a4] to-[#0c8a89] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>
          ) : null}

          {/* Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white px-7 py-7 shadow-[0_4px_28px_-6px_rgba(15,23,42,0.10),0_1px_4px_rgba(15,23,42,0.05)]">

            {/* Workspace picker */}
            {clinicChoices.length > 1 ? (
              <form onSubmit={continueWithClinic} className="space-y-5">
                <div>
                  <p className="mb-3 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                    Select workspace
                  </p>
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
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await supabaseBrowser().auth.signOut();
                    setClinicChoices([]);
                    setSelectedMemberId("");
                    setBusy(false);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                >
                  ← Sign out &amp; change role
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
                    <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      Your role
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((item) => {
                        const active = role === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setRole(item.key);
                              setEmailTouched(Boolean(email.trim()));
                              emailInputRef.current?.focus();
                            }}
                            className={`relative rounded-xl border px-3 py-2.5 text-left transition ${
                              active
                                ? "border-transparent bg-teal-50 shadow-[0_0_0_1.5px_#0ea5a4]"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
                              style={
                                active
                                  ? { background: item.color, color: "#fff" }
                                  : { background: "#f1f5f9", color: "#64748b" }
                              }
                            >
                              {item.short}
                            </span>
                            <div className={`mt-1.5 text-[12px] font-bold ${active ? "text-teal-900" : "text-slate-700"}`}>
                              {item.label}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-slate-400">{item.detail}</div>
                          </button>
                        );
                      })}
                    </div>

                    {mode === "signup" && role !== "admin" ? (
                      <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] font-semibold text-amber-800">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01"/>
                        </svg>
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
                  onChange={(value) => {
                    setEmail(value);
                    setEmailTouched(true);
                  }}
                  placeholder={isProviderLogin ? "provider@example.com" : "you@clinic.in"}
                  error={emailError}
                />

                <div>
                  <AuthField
                    label="Password"
                    name={isProviderLogin ? "super_admin_password" : "password"}
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    autoComplete={isProviderLogin ? "new-password" : mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={setPassword}
                    placeholder="At least 6 characters"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    }
                  />
                  {mode === "signin" ? (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={busy}
                        className="text-[12px] font-semibold text-[#0ea5a4] hover:underline disabled:opacity-60"
                      >
                        Forgot password?
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary h-12 w-full rounded-xl text-[14px]"
                >
                  {busy ? <Spinner /> : null}
                  {isProviderLogin
                    ? "Sign In to App Provider Console"
                    : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
                  {!busy ? <ArrowIcon /> : null}
                </button>
              </form>
            )}

            {/* Security line */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <LockIcon />
              Secure &middot; Role-based access &middot; HIPAA ready
            </div>
          </div>

          {/* Patient portal separator */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold text-slate-700">
                  {isProviderLogin ? "Looking for staff login?" : "Are you a patient?"}
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  {isProviderLogin ? "Go back to the clinic staff portal." : "Access your records, appointments & more."}
                </p>
              </div>
              {isProviderLogin ? (
                <a
                  href="/login"
                  className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[12px] font-bold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  Staff Login
                </a>
              ) : (
                <a
                  href="/patient/clinics"
                  className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[12px] font-bold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  Patient Portal
                </a>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] font-medium text-slate-400">
            © {new Date().getFullYear()} MedAssist. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a4 4 0 008 0V3" />
      <path d="M10 14v2a4 4 0 008 0v-2" />
      <circle cx="18" cy="11" r="2" />
    </svg>
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
  error,
  rightElement,
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
  error?: string;
  rightElement?: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </label>
      <div className="relative">
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
          className={`input-base h-11 rounded-xl px-4 text-[14px] ${
            rightElement ? "pr-12" : ""
          } ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
          aria-invalid={Boolean(error)}
        />
        {rightElement ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-[12px] font-semibold text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.6 5.2A8 8 0 0110 5c4.8 0 7.5 5 7.5 5a12.6 12.6 0 01-2.1 2.7M11.8 11.8A2.5 2.5 0 018.2 8.2M2.5 2.5l15 15M5.9 5.9C3.7 7.3 2.5 10 2.5 10s2.7 5 7.5 5a8 8 0 003.1-.6" />
    </svg>
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
