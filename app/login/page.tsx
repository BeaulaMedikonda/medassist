"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TextInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const { push } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        push({ title: "Welcome back", variant: "success" });
        router.replace(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
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
      push({ title: "Could not sign in", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 p-6 dark:from-ink-950 dark:via-ink-950 dark:to-ink-975">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v6a4 4 0 008 0V3" />
              <path d="M10 14v2a4 4 0 008 0v-2" />
              <circle cx="18" cy="11" r="2" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-ink-100">Hello Doctor</div>
            <div className="text-xs text-slate-500 dark:text-ink-500">
              Clinic management & AI-powered EMR
            </div>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-ink-100">
            {mode === "signin" ? "Sign in to your clinic" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-ink-500">
            {mode === "signin"
              ? "Pick up where you left off."
              : "We'll set up your profile right after."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <TextInput
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.in"
            />
            <TextInput
              label="Password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Spinner /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-ink-400">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have one?{" "}
                <button
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in instead
                </button>
              </>
            )}
          </div>
        </div>

      </div>
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
